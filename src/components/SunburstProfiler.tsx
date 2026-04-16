import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { useTelemetryStore, type SemanticEnergyFingerprintNode } from '../store/useTelemetryStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#ef4444', '#0ea5e9', '#059669'];

interface SunburstDatum {
    name: string;
    value?: number;
    line?: number;
    children?: SunburstDatum[];
}

function buildHierarchy(astTree: SemanticEnergyFingerprintNode[]): SunburstDatum {
    const groupedByType = new Map<string, SemanticEnergyFingerprintNode[]>();

    for (const node of astTree) {
        const bucket = groupedByType.get(node.nodeType) ?? [];
        bucket.push(node);
        groupedByType.set(node.nodeType, bucket);
    }

    const children: SunburstDatum[] = [...groupedByType.entries()]
        .map(([nodeType, nodes]) => {
            const byLine = new Map<number, number>();
            for (const node of nodes) {
                const current = byLine.get(node.line) ?? 0;
                byLine.set(node.line, current + node.estimatedJoules);
            }

            const lineChildren = [...byLine.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([line, totalJoules]) => ({
                    name: `Line ${line}`,
                    line,
                    value: totalJoules,
                }));

            const totalByType = nodes.reduce((sum, node) => sum + node.estimatedJoules, 0);

            return {
                name: nodeType,
                value: totalByType,
                children: lineChildren,
            };
        })
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    return {
        name: 'AST Root',
        children,
    };
}

function arcLabelVisible(datum: d3.HierarchyRectangularNode<SunburstDatum>): boolean {
    return (datum.y1 - datum.y0) > 14 && (datum.x1 - datum.x0) > 0.1;
}

function pickNodeLine(datum: d3.HierarchyRectangularNode<SunburstDatum>): number | null {
    if (typeof datum.data.line === 'number') {
        return datum.data.line;
    }

    for (const descendant of datum.descendants()) {
        if (typeof descendant.data.line === 'number') {
            return descendant.data.line;
        }
    }

    return null;
}

export const SunburstProfiler: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const { astTree, isRunning, isAnalyzing, selectLine } = useTelemetryStore();
    const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

    const hierarchyData = useMemo(() => buildHierarchy(astTree), [astTree]);

    const renderSunburst = useCallback(() => {
        if (!svgRef.current || !containerRef.current || !hierarchyData.children || hierarchyData.children.length === 0) {
            return;
        }

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (width <= 0 || height <= 0) {
            return;
        }

        const size = Math.min(width, height) - 20;
        const radius = Math.max(size / 2, 10);

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg
            .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)
            .attr('width', '100%')
            .attr('height', '100%');

        const rootHierarchy = d3
            .hierarchy<SunburstDatum>(hierarchyData)
            .sum((datum) => datum.value ?? 0)
            .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

        const partition = d3.partition<SunburstDatum>().size([2 * Math.PI, radius]);
        const rootRect = partition(rootHierarchy);

        const maxDepth = Math.max(...rootRect.descendants().map((node) => node.depth), 1);
        const depthScale = d3.scaleLinear().domain([0, maxDepth]).range([0, radius]);

        const arcGenerator = d3
            .arc<d3.HierarchyRectangularNode<SunburstDatum>>()
            .startAngle((datum) => datum.x0)
            .endAngle((datum) => datum.x1)
            .padAngle((datum) => Math.min((datum.x1 - datum.x0) / 2, 0.02))
            .padRadius(radius / 2)
            .innerRadius((datum) => depthScale(datum.depth))
            .outerRadius((datum) => Math.max(depthScale(datum.depth), depthScale(datum.depth + 1) - 2));

        const colorScale = d3.scaleOrdinal<string, string>(COLORS);
        const chartRoot = svg.append('g');

        const nodes: d3.HierarchyRectangularNode<SunburstDatum>[] = rootRect.descendants().filter((datum) => datum.depth > 0);

        const cell = chartRoot
            .append('g')
            .selectAll<SVGGElement, d3.HierarchyRectangularNode<SunburstDatum>>('g')
            .data(nodes)
            .join('g');

        cell
            .append('path')
            .attr('d', (datum) => arcGenerator(datum) ?? '')
            .attr('fill', (datum) => {
                const topLevel = datum.ancestors().find((ancestor) => ancestor.depth === 1) ?? datum;
                return colorScale(topLevel.data.name);
            })
            .attr('fill-opacity', (datum) => Math.max(0.25, 1 - datum.depth * 0.18))
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.2)
            .style('cursor', 'pointer')
            .on('mousemove', (event, datum) => {
                const tooltip = tooltipRef.current;
                if (!tooltip || !containerRef.current || !rootRect.value) {
                    return;
                }

                const localRect = containerRef.current.getBoundingClientRect();
                const value = datum.value ?? 0;
                const ratio = (value / rootRect.value) * 100;

                tooltip.style.display = 'block';
                tooltip.style.left = `${event.clientX - localRect.left + 14}px`;
                tooltip.style.top = `${event.clientY - localRect.top - 14}px`;
                tooltip.innerHTML = [
                    `<div class=\"font-bold text-blue-700\">${datum.data.name}</div>`,
                    `<div>Energy: <span class=\"text-orange-500\">${value.toFixed(4)}J</span></div>`,
                    `<div>Share: <span class=\"text-emerald-600\">${ratio.toFixed(1)}%</span></div>`,
                    `<div>Depth: <span class=\"text-indigo-600\">${datum.depth}</span></div>`,
                ].join('');

                const trail = datum
                    .ancestors()
                    .reverse()
                    .map((node) => node.data.name);
                setBreadcrumb(trail);
            })
            .on('mouseleave', () => {
                if (tooltipRef.current) {
                    tooltipRef.current.style.display = 'none';
                }
                setBreadcrumb([]);
            })
            .on('click', (_, datum) => {
                const line = pickNodeLine(datum);
                if (line !== null) {
                    selectLine(line);
                }
            });

        cell
            .append('text')
            .filter((datum) => arcLabelVisible(datum))
            .attr('transform', (datum) => {
                const angle = ((datum.x0 + datum.x1) / 2) * (180 / Math.PI);
                const depthMiddle = (depthScale(datum.depth) + depthScale(datum.depth + 1)) / 2;
                return `rotate(${angle - 90}) translate(${depthMiddle},0) rotate(${angle < 180 ? 0 : 180})`;
            })
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '10px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .attr('fill', '#1e293b')
            .attr('pointer-events', 'none')
            .text((datum) => datum.data.name);

        svg
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '12px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .attr('fill', '#64748b')
            .text('AST Energy');
    }, [hierarchyData, selectLine]);

    useEffect(() => {
        renderSunburst();
    }, [renderSunburst]);

    useEffect(() => {
        const observer = new ResizeObserver(() => renderSunburst());
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, [renderSunburst]);

    const hasData = isRunning && astTree.length > 0;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Sunburst Profiler</span>
                <span className="text-[10px] font-mono text-slate-400">AST NodeType {'->'} Line {'->'} Joules</span>
            </div>

            <div className="flex-none px-3 py-1 flex items-center gap-1 text-[10px] font-mono text-slate-300 border-b border-slate-700/30 min-h-[25px]">
                {breadcrumb.length > 0
                    ? breadcrumb.map((name, index) => (
                        <React.Fragment key={`${name}-${index}`}>
                            {index > 0 && <span className="text-slate-700">{'>'}</span>}
                            <span className={index === breadcrumb.length - 1 ? 'text-blue-500 font-bold' : ''}>{name}</span>
                        </React.Fragment>
                    ))
                    : <span className="opacity-0">trace</span>}
            </div>

            <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden">
                {isAnalyzing && (
                    <div className="absolute inset-0 z-20 bg-white/75 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-2/3 max-w-sm space-y-2">
                            <div className="h-3 rounded bg-slate-800 animate-pulse" />
                            <div className="h-3 rounded bg-slate-800 animate-pulse w-10/12" />
                            <p className="text-center text-xs font-mono text-blue-500">Compiling AST hierarchy for sunburst...</p>
                        </div>
                    </div>
                )}

                {!hasData ? (
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-slate-400 text-sm font-mono text-center absolute"
                    >
                        <div className="text-xs">Run analysis to render the AST energy hierarchy</div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.45 }}
                        className="w-full h-full absolute inset-0"
                    >
                        <svg ref={svgRef} className="w-full h-full block" />
                    </motion.div>
                )}

                <div ref={tooltipRef} className="d3-tooltip z-50 pointer-events-none" style={{ display: 'none', position: 'absolute' }} />
            </div>
        </div>
    );
};

