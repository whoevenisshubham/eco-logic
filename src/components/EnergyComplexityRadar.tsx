// EnergyComplexityRadar.tsx — 5-axis Radar: CPU Core Energy, DRAM Latency, Cache Miss Impact, GPU Transfer, Time Complexity
import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { dataEngine } from '../engine/SimulatedDataEngine';

const AXES = [
    { key: 'cpu', label: 'CPU Core Energy', color: '#ff3366' },
    { key: 'dram', label: 'DRAM Latency', color: '#b44fff' },
    { key: 'cache', label: 'Cache Efficiency', color: '#4fc3f7' },
    { key: 'gpu', label: 'GPU Transfer', color: '#ffd700' },
    { key: 'complexity', label: 'Time Complexity', color: '#00ff88' },
];

export const EnergyComplexityRadar: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { algorithmA, algorithmB, isRunning } = useTelemetryStore();

    const renderRadar = useCallback(() => {
        if (!svgRef.current || !containerRef.current || !isRunning) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (width === 0 || height === 0) return;

        const size = Math.min(width, height);
        // Padding for labels (55px around the edges)
        const r = Math.max(20, (size / 2) - 55);
        const n = AXES.length;
        const angles = AXES.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);

        const dataA = dataEngine.generateRadarData(algorithmA);
        const dataB = dataEngine.generateRadarData(algorithmB);

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Center the coordinate system at 0,0
        svg.attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)
            .attr('width', '100%').attr('height', '100%');

        // Grid rings
        [0.2, 0.4, 0.6, 0.8, 1.0].forEach(frac => {
            const pts = angles.map(a => [Math.cos(a) * r * frac, Math.sin(a) * r * frac]);
            svg.append('polygon').attr('points', pts.map(p => p.join(',')).join(' '))
                .attr('fill', 'none').attr('stroke', 'rgba(26,58,92,0.6)').attr('stroke-width', 0.5);
            svg.append('text').attr('x', 3).attr('y', -r * frac + 3)
                .attr('fill', '#3a6b8a').attr('font-size', '10px').attr('font-family', 'JetBrains Mono')
                .text(`${(frac * 100).toFixed(0)}`);
        });

        // Axis spokes + labels
        AXES.forEach((axis, i) => {
            const angle = angles[i];
            const ax = Math.cos(angle) * r;
            const ay = Math.sin(angle) * r;
            svg.append('line').attr('x1', 0).attr('y1', 0).attr('x2', ax).attr('y2', ay)
                .attr('stroke', 'rgba(26,58,92,0.8)').attr('stroke-width', 0.5);

            // Labels with dynamic radius padding
            const lx = Math.cos(angle) * (r + 20);
            const ly = Math.sin(angle) * (r + 20);

            // Align text based on angle
            let textAnchor = 'middle';
            if (Math.cos(angle) > 0.1) textAnchor = 'start';
            else if (Math.cos(angle) < -0.1) textAnchor = 'end';

            const words = axis.label.split(' ');
            const textEl = svg.append('text').attr('x', lx).attr('y', ly)
                .attr('fill', axis.color).attr('font-size', '11px').attr('font-weight', '600')
                .attr('font-family', 'JetBrains Mono').attr('text-anchor', textAnchor).attr('dominant-baseline', 'middle');

            words.forEach((w, wi) => {
                textEl.append('tspan').attr('x', lx).attr('dy', wi === 0 ? 0 : 14).text(w);
            });
        });

        // Draw polygon for dataset
        const drawPoly = (data: number[], color: string, opacity: number, filled: boolean) => {
            const points = angles.map((angle, i) => {
                const val = (data[i] / 100) * r;
                return [Math.cos(angle) * val, Math.sin(angle) * val];
            });
            svg.append('polygon')
                .attr('points', points.map(p => p.join(',')).join(' '))
                .attr('stroke', color).attr('stroke-width', 2)
                .attr('fill', filled ? color : 'none').attr('fill-opacity', filled ? 0.15 : 0)
                .attr('opacity', opacity).attr('filter', `drop-shadow(0 0 8px ${color})`);

            // Dots
            points.forEach(([px, py]) => {
                svg.append('circle').attr('cx', px).attr('cy', py).attr('r', 4).attr('fill', color).attr('opacity', 0.9);
            });
        };

        drawPoly(dataA, '#00d4ff', 1, true);
        if (algorithmB !== algorithmA) drawPoly(dataB, '#00ff88', 0.85, true);

        // Legend (Bottom Left corner)
        const lg = svg.append('g').attr('transform', `translate(${-width / 2 + 20}, ${height / 2 - 40})`);
        lg.append('rect').attr('width', 16).attr('height', 4).attr('y', 4).attr('rx', 2).attr('fill', '#00d4ff').attr('opacity', 0.8);
        lg.append('text').attr('x', 24).attr('y', 10).attr('fill', '#7ab8d4').attr('font-size', '11px').attr('font-weight', '600').text(algorithmA === 'mergesort' ? 'MergeSort' : 'TimSort');
        lg.append('rect').attr('width', 16).attr('height', 4).attr('y', 20).attr('rx', 2).attr('fill', '#00ff88').attr('opacity', 0.8);
        lg.append('text').attr('x', 24).attr('y', 26).attr('fill', '#7ab8d4').attr('font-size', '11px').attr('font-weight', '600').text(algorithmB === 'timsort' ? 'TimSort' : 'MergeSort');

    }, [algorithmA, algorithmB, isRunning]);

    useEffect(() => { renderRadar(); }, [renderRadar]);
    useEffect(() => {
        const observer = new ResizeObserver(() => renderRadar());
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [renderRadar]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Energy-Complexity Radar</span>
                <span className="text-[10px] font-mono text-cyber-text-muted">5-Axis Divergence</span>
            </div>
            <div ref={containerRef} className="flex-1 flex items-center justify-center relative overflow-hidden p-2">
                {!isRunning ? (
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-cyber-text-muted text-sm font-mono text-center absolute"
                    >
                        <div className="text-2xl mb-1">📡</div>
                        <div className="text-xs">Run profiler to see radar</div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full absolute inset-0"
                    >
                        <svg ref={svgRef} className="w-full h-full block" />
                    </motion.div>
                )}
            </div>
        </div>
    );
};
