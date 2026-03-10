// TimeSeriesEnergyChart.tsx — D3 time-series with sub-millisecond tooltips and deep-link
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { useTelemetryStore } from '../store/useTelemetryStore';
import type { TelemetryPoint } from '../engine/SimulatedDataEngine';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const MARGIN = { top: 12, right: 20, bottom: 36, left: 52 };

export const TimeSeriesEnergyChart: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const { telemetryA, telemetryB, isRunning, selectLine, setTimeWindow } = useTelemetryStore();
    const [showBoth, setShowBoth] = useState(true);

    const renderChart = useCallback(() => {
        if (!svgRef.current || !containerRef.current || !telemetryA.length) return;

        const container = containerRef.current;
        const width = container.clientWidth - MARGIN.left - MARGIN.right;
        const height = container.clientHeight - MARGIN.top - MARGIN.bottom;

        // Downsample for perf: max 800 points
        const downsample = (data: TelemetryPoint[], max: number) => {
            if (data.length <= max) return data;
            const step = Math.ceil(data.length / max);
            return data.filter((_, i) => i % step === 0);
        };

        const dataA = downsample(telemetryA, 800);
        const dataB = downsample(telemetryB, 800);

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('width', width + MARGIN.left + MARGIN.right).attr('height', height + MARGIN.top + MARGIN.bottom);

        const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        // Scales
        const allData = showBoth ? [...dataA, ...dataB] : dataA;
        const xExtent = d3.extent(allData, d => d.elapsed) as [number, number];
        const yMax = d3.max(allData, d => d.energy) || 10;

        const xScale = d3.scaleLinear().domain(xExtent).range([0, width]);
        const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([height, 0]);

        // Grid lines
        g.append('g').attr('class', 'grid')
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(() => ''))
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').attr('stroke', 'rgba(26,58,92,0.5)').attr('stroke-dasharray', '4,4'));

        // Area gradient
        const defs = svg.append('defs');

        const gradientA = defs.append('linearGradient').attr('id', 'gradA').attr('gradientUnits', 'userSpaceOnUse').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', height);
        gradientA.append('stop').attr('offset', '0%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.3);
        gradientA.append('stop').attr('offset', '100%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.01);

        const gradientB = defs.append('linearGradient').attr('id', 'gradB').attr('gradientUnits', 'userSpaceOnUse').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', height);
        gradientB.append('stop').attr('offset', '0%').attr('stop-color', '#00ff88').attr('stop-opacity', 0.25);
        gradientB.append('stop').attr('offset', '100%').attr('stop-color', '#00ff88').attr('stop-opacity', 0.01);

        // Clip path
        defs.append('clipPath').attr('id', 'clip').append('rect').attr('width', width).attr('height', height);

        const chartArea = g.append('g').attr('clip-path', 'url(#clip)');

        // Line + Area generators
        const lineGen = d3.line<TelemetryPoint>().x(d => xScale(d.elapsed)).y(d => yScale(d.energy)).curve(d3.curveCatmullRom.alpha(0.5));
        const areaGen = d3.area<TelemetryPoint>().x(d => xScale(d.elapsed)).y0(height).y1(d => yScale(d.energy)).curve(d3.curveCatmullRom.alpha(0.5));

        // Draw series A
        chartArea.append('path').datum(dataA).attr('fill', 'url(#gradA)').attr('d', areaGen);
        chartArea.append('path').datum(dataA).attr('fill', 'none').attr('stroke', '#00d4ff').attr('stroke-width', 1.5).attr('d', lineGen).attr('filter', 'drop-shadow(0 0 4px rgba(0,212,255,0.6))');

        // Draw series B
        if (showBoth && dataB.length) {
            chartArea.append('path').datum(dataB).attr('fill', 'url(#gradB)').attr('d', areaGen);
            chartArea.append('path').datum(dataB).attr('fill', 'none').attr('stroke', '#00ff88').attr('stroke-width', 1.5).attr('d', lineGen).attr('filter', 'drop-shadow(0 0 4px rgba(0,255,136,0.5))');
        }

        // Spike annotations
        const spikes = dataA.filter(d => d.energy > yMax * 0.75);
        chartArea.selectAll('.spike').data(spikes.slice(0, 8))
            .join('circle').attr('cx', d => xScale(d.elapsed)).attr('cy', d => yScale(d.energy))
            .attr('r', 3).attr('fill', '#ff3366').attr('opacity', 0.9)
            .attr('filter', 'drop-shadow(0 0 6px rgba(255,51,102,0.8))');

        // Axes
        const xAxis = g.append('g').attr('transform', `translate(0,${height})`).call(
            d3.axisBottom(xScale).ticks(6).tickFormat(d => `${(+d).toFixed(0)}ms`)
        );
        xAxis.call(g => g.select('.domain').attr('stroke', '#1a3a5c'));
        xAxis.call(g => g.selectAll('.tick line').attr('stroke', '#1a3a5c'));
        xAxis.call(g => g.selectAll('.tick text').attr('fill', '#7ab8d4').attr('font-size', '10px').attr('font-family', 'JetBrains Mono, monospace'));

        const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${+d}J`));
        yAxis.call(g => g.select('.domain').attr('stroke', '#1a3a5c'));
        yAxis.call(g => g.selectAll('.tick line').attr('stroke', '#1a3a5c'));
        yAxis.call(g => g.selectAll('.tick text').attr('fill', '#7ab8d4').attr('font-size', '10px').attr('font-family', 'JetBrains Mono, monospace'));

        // Crosshair + tooltip interaction
        const crosshairV = g.append('line').attr('stroke', 'rgba(0,212,255,0.4)').attr('stroke-width', 1).attr('stroke-dasharray', '4,4').attr('y1', 0).attr('y2', height).style('opacity', 0);
        const crosshairH = g.append('line').attr('stroke', 'rgba(0,212,255,0.2)').attr('stroke-width', 1).attr('stroke-dasharray', '4,4').attr('x1', 0).attr('x2', width).style('opacity', 0);

        const overlay = g.append('rect').attr('width', width).attr('height', height).attr('fill', 'none').attr('pointer-events', 'all');

        overlay.on('mousemove', function (event) {
            const [mx, my] = d3.pointer(event);
            const elapsed = xScale.invert(mx);
            const closest = dataA.reduce((a, b) => Math.abs(b.elapsed - elapsed) < Math.abs(a.elapsed - elapsed) ? b : a);

            crosshairV.attr('x1', mx).attr('x2', mx).style('opacity', 1);
            crosshairH.attr('y1', yScale(closest.energy)).attr('y2', yScale(closest.energy)).style('opacity', 1);

            const tooltip = tooltipRef.current;
            if (tooltip) {
                const parentRect = containerRef.current!.getBoundingClientRect();
                tooltip.style.display = 'block';
                tooltip.style.left = `${event.clientX - parentRect.left + 14}px`;
                tooltip.style.top = `${event.clientY - parentRect.top - 10}px`;
                tooltip.innerHTML = `
          <div class="text-cyber-accent font-bold">${closest.functionName}</div>
          <div>Energy: <span class="text-cyber-orange">${closest.energy.toFixed(3)}J</span></div>
          <div>CPU: <span class="text-cyber-red">${closest.cpuCore.toFixed(1)}W</span></div>
          <div>DRAM: <span class="text-cyber-purple">${closest.dramLatency.toFixed(1)}ns</span></div>
          <div>Cache: <span class="text-cyber-green">${(closest.cacheHitRate * 100).toFixed(1)}%</span></div>
          <div>Line: <span class="text-cyber-yellow">${closest.lineId}</span></div>
          <div class="text-xs opacity-60">t=${closest.elapsed.toFixed(1)}ms</div>
        `;
            }
        }).on('mouseleave', () => {
            crosshairV.style('opacity', 0);
            crosshairH.style('opacity', 0);
            if (tooltipRef.current) tooltipRef.current.style.display = 'none';
        }).on('click', function (event) {
            const [mx] = d3.pointer(event);
            const elapsed = xScale.invert(mx);
            const closest = dataA.reduce((a, b) => Math.abs(b.elapsed - elapsed) < Math.abs(a.elapsed - elapsed) ? b : a);
            selectLine(closest.lineId);
        });

        // Brush for time window selection
        const brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on('end', (event) => {
                if (!event.selection) { setTimeWindow(null); return; }
                const [x0, x1] = event.selection as [number, number];
                setTimeWindow([xScale.invert(x0), xScale.invert(x1)]);
            });

        // Legend
        const legend = g.append('g').attr('transform', `translate(${width - 160}, 4)`);
        legend.append('line').attr('x1', 0).attr('x2', 20).attr('stroke', '#00d4ff').attr('stroke-width', 2).attr('y1', 6).attr('y2', 6);
        legend.append('text').attr('x', 25).attr('y', 10).attr('fill', '#7ab8d4').attr('font-size', '10px').text('MergeSort');
        if (showBoth) {
            legend.append('line').attr('x1', 0).attr('x2', 20).attr('stroke', '#00ff88').attr('stroke-width', 2).attr('y1', 22).attr('y2', 22);
            legend.append('text').attr('x', 25).attr('y', 26).attr('fill', '#7ab8d4').attr('font-size', '10px').text('TimSort');
        }

    }, [telemetryA, telemetryB, isRunning, showBoth, selectLine, setTimeWindow]);

    useEffect(() => {
        renderChart();
    }, [renderChart]);

    useEffect(() => {
        const observer = new ResizeObserver(() => renderChart());
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [renderChart]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Energy Time-Series</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowBoth(!showBoth)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${showBoth ? 'border-cyber-green/40 text-cyber-green bg-cyber-green/10' : 'border-cyber-border/40 text-cyber-text-secondary'}`}
                    >
                        Compare
                    </button>
                    <span className="text-[10px] font-mono text-cyber-text-muted">Click spike → jump to code</span>
                </div>
            </div>
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                {!isRunning ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-cyber-text-muted text-sm font-mono text-center"
                        >
                            <div className="text-2xl mb-2">▶</div>
                            <div>Run Profiler to stream live data</div>
                        </motion.div>
                    </div>
                ) : (
                    <svg ref={svgRef} className="w-full h-full" />
                )}
                <div ref={tooltipRef} className="d3-tooltip" style={{ display: 'none', position: 'absolute' }} />
            </div>
        </div>
    );
};
