// EnergyFlameGraph.tsx — Flame chart (X=time, Y=stack depth, color=energy intensity)
import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { dataEngine } from '../engine/SimulatedDataEngine';
import type { FlameNode } from '../engine/SimulatedDataEngine';

const MARGIN = { top: 8, right: 10, bottom: 30, left: 50 };

function flattenFlame(nodes: FlameNode[], result: FlameNode[] = []): FlameNode[] {
    for (const node of nodes) {
        result.push(node);
        if (node.children) flattenFlame(node.children, result);
    }
    return result;
}

// Energy color scale
const energyColor = d3.scaleSequential()
    .domain([0, 5])
    .interpolator(d3.interpolateRgbBasis(['#00ff88', '#ffd700', '#ff6b35', '#ff3366']));

export const EnergyFlameGraph: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const { algorithmA, isRunning, selectLine, setHoveredFlameNode } = useTelemetryStore();
    const [selectedNode, setSelectedNode] = useState<FlameNode | null>(null);

    const renderFlame = useCallback(() => {
        if (!svgRef.current || !containerRef.current || !isRunning) return;

        const width = containerRef.current.clientWidth - MARGIN.left - MARGIN.right;
        const containerHeight = containerRef.current.clientHeight - MARGIN.top - MARGIN.bottom;

        if (width <= 0 || containerHeight <= 0) return;

        const flameNodes = dataEngine.generateFlameGraph(algorithmA);
        const flat = flattenFlame(flameNodes);
        const maxDepth = Math.max(...flat.map(n => n.depth));
        const totalTime = Math.max(...flat.map(n => n.end));

        // Dynamically compute flame height to fill vertical space up to a reasonable max
        const computedFlameHeight = Math.max(20, Math.min(80, containerHeight / (maxDepth + 1)));

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('width', width + MARGIN.left + MARGIN.right).attr('height', containerHeight + MARGIN.top + MARGIN.bottom);

        const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        // Time scale (X-axis = time)
        const xScale = d3.scaleLinear().domain([0, totalTime]).range([0, width]);

        // Depth scale (Y-axis = stack depth, top-down)
        const yScale = (depth: number) => MARGIN.top + depth * computedFlameHeight;

        // Draw flame rectangles
        g.selectAll('.flame-rect')
            .data(flat)
            .join('rect')
            .attr('class', 'flame-rect')
            .attr('x', d => xScale(d.start))
            .attr('y', d => yScale(d.depth))
            .attr('width', d => Math.max(1, xScale(d.end) - xScale(d.start) - 1))
            .attr('height', computedFlameHeight - 4)
            .attr('rx', 2)
            .attr('fill', d => energyColor(d.energy))
            .attr('opacity', d => selectedNode ? (d === selectedNode ? 1 : 0.4) : 0.9)
            .attr('stroke', d => d === selectedNode ? '#ffffff' : 'rgba(0,0,0,0.2)')
            .attr('stroke-width', d => d === selectedNode ? 2 : 0.5)
            .on('mousemove', function (event, d) {
                setHoveredFlameNode(d.astNodeId);
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    tooltip.style.display = 'block';
                    tooltip.style.left = `${event.offsetX + 14}px`;
                    tooltip.style.top = `${event.offsetY - 10}px`;
                    tooltip.innerHTML = `
            <div class="font-bold" style="color:${energyColor(d.energy)}">${d.name}</div>
            <div>Energy: <span style="color:#ff6b35">${d.energy.toFixed(3)}J</span></div>
            <div>Duration: <span style="color:#ffd700">${(d.end - d.start).toFixed(1)}ms</span></div>
            <div>Stack: <span style="color:#00ff88">depth ${d.depth}</span></div>
          `;
                }
            })
            .on('mouseleave', () => {
                setHoveredFlameNode(null);
                if (tooltipRef.current) tooltipRef.current.style.display = 'none';
            })
            .on('click', (_, d) => {
                setSelectedNode(prev => prev === d ? null : d);
                selectLine(d.astNodeId ? parseInt(d.astNodeId.replace('ast-', '')) * 3 + 1 : 1);
            });

        // Labels on flame rects (SVG clip Path to prevent overflow)
        svg.append('defs').selectAll('clipPath')
            .data(flat)
            .join('clipPath')
            .attr('id', (_, i) => `clip-${i}`)
            .append('rect')
            .attr('x', d => xScale(d.start))
            .attr('y', d => yScale(d.depth))
            .attr('width', d => Math.max(0, xScale(d.end) - xScale(d.start) - 4))
            .attr('height', computedFlameHeight);

        g.selectAll('.flame-label')
            .data(flat)
            .join('text')
            .attr('class', 'flame-label')
            .attr('clip-path', (_, i) => `url(#clip-${i})`)
            .attr('x', d => xScale(d.start) + 4)
            .attr('y', d => yScale(d.depth) + (computedFlameHeight - 4) / 2)
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('font-family', 'JetBrains Mono, monospace')
            .attr('fill', 'rgba(0,0,0,0.7)')
            .attr('pointer-events', 'none')
            .text(d => {
                const rectWidth = xScale(d.end) - xScale(d.start);
                return rectWidth > 30 ? d.name : '';
            });

        // X-axis (moved to bottom directly beneath the deepest flame)
        const computedMaxHeight = (maxDepth + 1) * computedFlameHeight;
        const xAxis = g.append('g').attr('transform', `translate(0,${computedMaxHeight + 4})`)
            .call(d3.axisBottom(xScale).ticks(8).tickFormat(d => `${d}ms`));
        xAxis.call(g => g.select('.domain').attr('stroke', '#1a3a5c'));
        xAxis.call(g => g.selectAll('.tick line').attr('stroke', '#1a3a5c'));
        xAxis.call(g => g.selectAll('.tick text').attr('fill', '#7ab8d4').attr('font-size', '10px').attr('font-family', 'JetBrains Mono'));

        // Depth labels
        for (let d = 0; d <= maxDepth; d++) {
            g.append('text')
                .attr('x', -8)
                .attr('y', yScale(d) + computedFlameHeight / 2)
                .attr('dominant-baseline', 'middle')
                .attr('text-anchor', 'end')
                .attr('fill', '#3a6b8a')
                .attr('font-size', '9px')
                .attr('font-family', 'JetBrains Mono')
                .text(d === 0 ? 'root' : `d${d}`);
        }

        // Energy legend gradient
        const legendWidth = 100;
        const legendGrad = svg.append('defs').append('linearGradient').attr('id', 'flameLegend').attr('x1', '0%').attr('x2', '100%');
        const stops = [0, 0.25, 0.5, 0.75, 1];
        stops.forEach(s => {
            legendGrad.append('stop').attr('offset', `${s * 100}%`).attr('stop-color', energyColor(s * 5));
        });
        const lg = svg.append('g').attr('transform', `translate(${MARGIN.left + width - legendWidth},${MARGIN.top})`);
        lg.append('rect').attr('width', legendWidth).attr('height', 8).attr('rx', 3).attr('fill', 'url(#flameLegend)');
        lg.append('text').attr('x', 0).attr('y', 18).attr('fill', '#7ab8d4').attr('font-size', '9px').text('Low');
        lg.append('text').attr('x', legendWidth).attr('y', 18).attr('fill', '#7ab8d4').attr('font-size', '9px').attr('text-anchor', 'end').text('High Energy');

    }, [algorithmA, isRunning, selectedNode, selectLine, setHoveredFlameNode]);

    useEffect(() => { renderFlame(); }, [renderFlame]);
    useEffect(() => {
        const observer = new ResizeObserver(() => renderFlame());
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [renderFlame]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Energy Flame Graph</span>
                <div className="flex items-center gap-2 text-xs text-cyber-text-muted font-mono">
                    <span>X: Time (ms)</span>
                    <span>|</span>
                    <span>Y: Stack Depth</span>
                    <span>|</span>
                    <span>Color: Energy Intensity</span>
                </div>
            </div>
            <div ref={containerRef} className="flex-1 relative overflow-auto p-2">
                {!isRunning ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-cyber-text-muted text-sm font-mono text-center"
                        >
                            <div className="text-2xl mb-2">🔥</div>
                            Run Profiler to generate flame graph
                        </motion.div>
                    </div>
                ) : (
                    <svg ref={svgRef} />
                )}
                <div ref={tooltipRef} className="d3-tooltip z-50 pointer-events-none" style={{ display: 'none', position: 'absolute' }} />
            </div>
        </div>
    );
};
