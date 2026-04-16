import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { useTelemetryStore, type SemanticEnergyFingerprintNode } from '../store/useTelemetryStore';

const MARGIN = { top: 12, right: 12, bottom: 30, left: 58 };
const COMPLEXITY_ORDER: Record<string, number> = {
    'O(1)': 0,
    'O(log N)': 1,
    'O(N)': 2,
    'O(N log N)': 3,
    'O(N^2)': 4,
    'O(2^N)': 5,
};

interface FlameRectNode {
    id: string;
    line: number;
    nodeType: string;
    complexity: string;
    estimatedJoules: number;
    depth: number;
    start: number;
    end: number;
}

function normalizeComplexity(value: string): string {
    const trimmed = value.trim();
    if (trimmed in COMPLEXITY_ORDER) {
        return trimmed;
    }
    return 'O(1)';
}

function buildFlameRows(astTree: SemanticEnergyFingerprintNode[]): FlameRectNode[] {
    const byDepth = new Map<number, SemanticEnergyFingerprintNode[]>();

    for (const node of astTree) {
        const normalizedComplexity = normalizeComplexity(node.complexity);
        const depth = COMPLEXITY_ORDER[normalizedComplexity];
        const row = byDepth.get(depth) ?? [];
        row.push({ ...node, complexity: normalizedComplexity });
        byDepth.set(depth, row);
    }

    const rows = [...byDepth.entries()].sort((a, b) => a[0] - b[0]);
    const flattened: FlameRectNode[] = [];

    for (const [depth, nodes] of rows) {
        const sorted = [...nodes].sort((a, b) => b.estimatedJoules - a.estimatedJoules);
        const rowTotal = sorted.reduce((sum, node) => sum + Math.max(node.estimatedJoules, 0.001), 0);

        let cursor = 0;
        for (const node of sorted) {
            const width = Math.max(node.estimatedJoules, 0.001);
            const start = cursor;
            const end = cursor + width;

            flattened.push({
                id: node.id,
                line: node.line,
                nodeType: node.nodeType,
                complexity: node.complexity,
                estimatedJoules: node.estimatedJoules,
                depth,
                start: rowTotal > 0 ? start / rowTotal : 0,
                end: rowTotal > 0 ? end / rowTotal : 0,
            });

            cursor = end;
        }
    }

    return flattened;
}

export const EnergyFlameGraph: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const {
        astTree,
        isRunning,
        isAnalyzing,
        selectLine,
        setHoveredFlameNode,
    } = useTelemetryStore();

    const flameNodes = useMemo(() => buildFlameRows(astTree), [astTree]);

    const renderFlame = useCallback(() => {
        if (!svgRef.current || !containerRef.current || !flameNodes.length) {
            return;
        }

        const width = containerRef.current.clientWidth - MARGIN.left - MARGIN.right;
        const height = containerRef.current.clientHeight - MARGIN.top - MARGIN.bottom;

        if (width <= 0 || height <= 0) {
            return;
        }

        const maxDepth = Math.max(...flameNodes.map((node) => node.depth), 0);
        const rowHeight = Math.max(24, Math.min(76, height / (maxDepth + 1)));
        const effectiveHeight = (maxDepth + 1) * rowHeight;

        const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);
        const yScale = (depth: number) => depth * rowHeight;

        const maxEnergy = Math.max(...flameNodes.map((node) => node.estimatedJoules), 0.001);
        const energyColor = d3
            .scaleSequential<number, string>()
            .domain([0, maxEnergy])
            .interpolator(d3.interpolateRgbBasis(['#10b981', '#eab308', '#f97316', '#f43f5e']));

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg
            .attr('width', width + MARGIN.left + MARGIN.right)
            .attr('height', effectiveHeight + MARGIN.top + MARGIN.bottom + 8);

        const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        g.selectAll<SVGRectElement, FlameRectNode>('.flame-rect')
            .data(flameNodes)
            .join('rect')
            .attr('class', 'flame-rect')
            .attr('x', (d) => xScale(d.start))
            .attr('y', (d) => yScale(d.depth))
            .attr('width', (d) => Math.max(1, xScale(d.end) - xScale(d.start) - 1))
            .attr('height', rowHeight - 5)
            .attr('rx', 3)
            .attr('fill', (d) => energyColor(d.estimatedJoules))
            .attr('opacity', (d) => (selectedNodeId && selectedNodeId !== d.id ? 0.35 : 0.92))
            .attr('stroke', (d) => (selectedNodeId === d.id ? '#0f172a' : 'rgba(0,0,0,0.1)'))
            .attr('stroke-width', (d) => (selectedNodeId === d.id ? 1.5 : 0.5))
            .on('mousemove', (event, d) => {
                setHoveredFlameNode(d.id);
                const tooltip = tooltipRef.current;
                if (!tooltip || !containerRef.current) {
                    return;
                }

                const containerRect = containerRef.current.getBoundingClientRect();
                tooltip.style.display = 'block';
                tooltip.style.left = `${event.clientX - containerRect.left + 12}px`;
                tooltip.style.top = `${event.clientY - containerRect.top - 10}px`;
                tooltip.innerHTML = [
                    `<div class="font-bold text-blue-700">${d.nodeType}</div>`,
                    `<div>Line: <span class="text-emerald-600">${d.line}</span></div>`,
                    `<div>Complexity: <span class="text-indigo-600">${d.complexity}</span></div>`,
                    `<div>Energy: <span class="text-orange-500">${d.estimatedJoules.toFixed(4)}J</span></div>`,
                ].join('');
            })
            .on('mouseleave', () => {
                setHoveredFlameNode(null);
                if (tooltipRef.current) {
                    tooltipRef.current.style.display = 'none';
                }
            })
            .on('click', (_, d) => {
                setSelectedNodeId((previous) => (previous === d.id ? null : d.id));
                selectLine(d.line);
            });

        g.selectAll<SVGTextElement, FlameRectNode>('.flame-label')
            .data(flameNodes)
            .join('text')
            .attr('class', 'flame-label')
            .attr('x', (d) => xScale(d.start) + 4)
            .attr('y', (d) => yScale(d.depth) + (rowHeight - 5) / 2)
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '10px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .attr('fill', 'rgba(0,0,0,0.72)')
            .attr('pointer-events', 'none')
            .text((d) => {
                const widthPx = xScale(d.end) - xScale(d.start);
                return widthPx >= 56 ? `${d.nodeType}  L${d.line}` : '';
            });

        const xAxis = g
            .append('g')
            .attr('transform', `translate(0,${effectiveHeight + 2})`)
            .call(d3.axisBottom(xScale).ticks(6).tickFormat((tick) => `${Math.round(Number(tick) * 100)}%`));

        xAxis.call((axis) => axis.select('.domain').attr('stroke', '#e2e8f0'));
        xAxis.call((axis) => axis.selectAll('.tick line').attr('stroke', '#e2e8f0'));
        xAxis.call((axis) =>
            axis
                .selectAll('.tick text')
                .attr('fill', '#64748b')
                .attr('font-size', '10px')
                .attr('font-family', 'JetBrains Mono, monospace')
        );

        for (let depth = 0; depth <= maxDepth; depth += 1) {
            const complexityLabel = Object.keys(COMPLEXITY_ORDER).find((key) => COMPLEXITY_ORDER[key] === depth) ?? `Depth ${depth}`;
            g.append('text')
                .attr('x', -8)
                .attr('y', yScale(depth) + rowHeight / 2)
                .attr('dominant-baseline', 'middle')
                .attr('text-anchor', 'end')
                .attr('fill', '#94a3b8')
                .attr('font-size', '9px')
                .attr('font-family', 'JetBrains Mono, monospace')
                .text(complexityLabel);
        }
    }, [flameNodes, selectLine, selectedNodeId, setHoveredFlameNode]);

    useEffect(() => {
        renderFlame();
    }, [renderFlame]);

    useEffect(() => {
        const observer = new ResizeObserver(() => renderFlame());
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, [renderFlame]);

    const hasData = flameNodes.length > 0;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header drag-handle cursor-grab active:cursor-grabbing border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
                <span className="panel-title font-semibold text-[14px]">Energy Flame Graph</span>
                <div className="flex items-center gap-2 text-[13px] text-gray-500 font-mono">
                    <span>Width: Joule share</span>
                    <span>|</span>
                    <span>Rows: Big-O class</span>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 relative overflow-hidden p-2">
                {isAnalyzing && (
                    <div className="absolute inset-0 z-20 bg-white/75 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-2/3 max-w-md space-y-2">
                            <div className="h-3 rounded bg-gray-50 animate-pulse" />
                            <div className="h-3 rounded bg-gray-50 animate-pulse" />
                            <div className="h-3 rounded bg-gray-50 animate-pulse w-5/6" />
                            <p className="text-center text-[13px] font-mono text-indigo-600">Building semantic energy flame map...</p>
                        </div>
                    </div>
                )}

                {!hasData || !isRunning ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ opacity: [0.45, 1, 0.45] }}
                            transition={{ duration: 1.8, repeat: Infinity }}
                            className="text-gray-500 text-sm font-mono text-center"
                        >
                            <div className="text-indigo-600">Run analysis to reveal AST energy hotspots</div>
                        </motion.div>
                    </div>
                ) : (
                    <svg ref={svgRef} className="w-full h-full" />
                )}

                <div
                    ref={tooltipRef}
                    className="d3-tooltip z-50 pointer-events-none"
                    style={{ display: 'none', position: 'absolute' }}
                />
            </div>
        </div>
    );
};

