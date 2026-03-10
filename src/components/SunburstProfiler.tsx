// SunburstProfiler.tsx — D3 nested sunburst hierarchical profiling
import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { dataEngine } from '../engine/SimulatedDataEngine';
import type { SunburstNode } from '../engine/SimulatedDataEngine';

const COLORS = ['#00d4ff', '#00ff88', '#ffd700', '#ff6b35', '#b44fff', '#ff3366', '#4fc3f7', '#00b35f'];

export const SunburstProfiler: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const { isRunning, selectLine } = useTelemetryStore();
    const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

    const renderSunburst = useCallback(() => {
        if (!svgRef.current || !containerRef.current || !isRunning) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (width === 0 || height === 0) return;

        const size = Math.min(width, height) - 20; // 10px padding
        const radius = size / 2;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`).attr('width', '100%').attr('height', '100%');

        const rawData = dataEngine.generateSunburst();

        // Build D3 hierarchy
        const root = d3.hierarchy<SunburstNode>(rawData)
            .sum(d => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        const partition = d3.partition<SunburstNode>().size([2 * Math.PI, radius]);
        partition(root);

        const arc = d3.arc<d3.HierarchyRectangularNode<SunburstNode>>()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.02))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => Math.max(d.y0, d.y1 - 2));

        const colorScale = d3.scaleOrdinal(COLORS);
        const g = svg.append('g');

        // Draw arcs
        const cell = g.append('g')
            .selectAll('g')
            .data(root.descendants().filter(d => d.depth > 0))
            .join('g');

        cell.append('path')
            .attr('fill', d => {
                let current = d;
                while (current.depth > 1 && current.parent) current = current.parent;
                return colorScale(current.data.name);
            })
            .attr('fill-opacity', d => Math.max(0.2, 1 - d.depth * 0.2))
            .attr('stroke', 'rgba(8,15,26,0.8)')
            .attr('stroke-width', 1.5)
            .attr('d', arc as any)
            .style('cursor', 'pointer')
            .attr('filter', 'drop-shadow(0 0 4px rgba(0,0,0,0.4))')
            .on('mouseover', function (event, d) {
                d3.select(this).attr('fill-opacity', 1).attr('filter', `drop-shadow(0 0 10px ${colorScale(d.data.name)})`);
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    tooltip.style.display = 'block';
                    tooltip.style.left = `${event.offsetX + 15}px`;
                    tooltip.style.top = `${event.offsetY - 15}px`;
                    tooltip.innerHTML = `
            <div class="font-bold" style="color:${colorScale(d.data.name)}">${d.data.name}</div>
            <div>Energy: <span style="color:#ff6b35">${((d.data.energy || d.value || 0)).toFixed(3)}J</span></div>
            <div>Share: <span style="color:#ffd700">${((d.value! / root.value!) * 100).toFixed(1)}%</span></div>
            <div>Depth: <span style="color:#00ff88">${d.depth}</span></div>
          `;
                }
                const trail = [];
                let current: d3.HierarchyNode<SunburstNode> | null = d;
                while (current) { trail.unshift(current.data.name); current = current.parent; }
                setBreadcrumb(trail);
            })
            .on('mouseleave', function (event, d) {
                const node = d as any;
                d3.select(this).attr('fill-opacity', Math.max(0.2, 1 - node.depth * 0.2)).attr('filter', 'drop-shadow(0 0 4px rgba(0,0,0,0.4))');
                if (tooltipRef.current) tooltipRef.current.style.display = 'none';
                setBreadcrumb([]);
            })
            .on('click', (_, d) => selectLine(d.depth * 10 + 1));

        // Labels
        const fontSize = Math.max(9, Math.min(12, size / 25)); // Dynamic font size spanning 9px to 12px
        cell.append('text')
            .filter((d: any) => (d.x1 - d.x0) > 0.12 && (d.y1 - d.y0) > 15) // Only label wide & tall enough arcs
            .attr('transform', (d: any) => {
                const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                const y = (d.y0 + d.y1) / 2;
                return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
            })
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${fontSize}px`)
            .attr('font-family', 'JetBrains Mono, monospace')
            .attr('font-weight', '600')
            .attr('fill', 'rgba(235,245,255,0.95)')
            .attr('pointer-events', 'none')
            .text((d: any) => {
                const angle = d.x1 - d.x0;
                const availableArcChars = Math.floor((angle * d.y0) / (fontSize * 0.6));
                if (availableArcChars < 4) return '';
                return d.data.name.length > availableArcChars ? d.data.name.slice(0, availableArcChars - 2) + '…' : d.data.name;
            });

        // Center label
        svg.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('font-size', `${fontSize + 2}px`).attr('font-weight', 'bold').attr('fill', '#7ab8d4').attr('font-family', 'JetBrains Mono').text('Program');

    }, [isRunning, selectLine]);

    useEffect(() => { renderSunburst(); }, [renderSunburst]);
    useEffect(() => {
        const observer = new ResizeObserver(() => renderSunburst());
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [renderSunburst]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Sunburst Profiler</span>
                <span className="text-[10px] font-mono text-cyber-text-muted">Hierarchical Energy</span>
            </div>

            {/* Breadcrumb trail */}
            <div className="flex-none px-3 py-1 flex items-center gap-1 text-[10px] font-mono text-cyber-text-secondary border-b border-cyber-border/30 min-h-[25px]">
                {breadcrumb.length > 0 ? breadcrumb.map((b, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <span className="text-cyber-border">›</span>}
                        <span className={i === breadcrumb.length - 1 ? 'text-cyber-accent font-bold' : ''}>{b}</span>
                    </React.Fragment>
                )) : <span className="opacity-0">-</span>}
            </div>

            <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden">
                {!isRunning ? (
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="text-cyber-text-muted text-sm font-mono text-center absolute">
                        <div className="text-2xl mb-1">☀️</div>
                        <div className="text-xs">Run to see sunburst</div>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, type: 'spring' }} className="w-full h-full absolute inset-0">
                        <svg ref={svgRef} className="w-full h-full block" />
                    </motion.div>
                )}
                <div ref={tooltipRef} className="d3-tooltip z-50 pointer-events-none" style={{ display: 'none', position: 'absolute' }} />
            </div>
        </div>
    );
};
