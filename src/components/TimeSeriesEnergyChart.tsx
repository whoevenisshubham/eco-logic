import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { useTelemetryStore, type TelemetryPoint } from '../store/useTelemetryStore';

const MARGIN = { top: 12, right: 20, bottom: 36, left: 52 };

function downsampleTelemetry(data: TelemetryPoint[], maxPoints: number): TelemetryPoint[] {
    if (data.length <= maxPoints) {
        return data;
    }

    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
}

export const TimeSeriesEnergyChart: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const {
        telemetryA,
        telemetryB,
        isRunning,
        isAnalyzing,
        selectLine,
        setTimeWindow,
    } = useTelemetryStore();

    const [showBoth, setShowBoth] = useState(false);

    const renderChart = useCallback(() => {
        if (!svgRef.current || !containerRef.current || telemetryA.length === 0) {
            return;
        }

        const container = containerRef.current;
        const width = container.clientWidth - MARGIN.left - MARGIN.right;
        const height = container.clientHeight - MARGIN.top - MARGIN.bottom;

        if (width <= 0 || height <= 0) {
            return;
        }

        const dataA = downsampleTelemetry(telemetryA, 800);
        const dataB = downsampleTelemetry(telemetryB, 800);
        const allData = showBoth && dataB.length > 0 ? [...dataA, ...dataB] : dataA;

        const xExtent = d3.extent(allData, (point) => point.nodeIndex);
        const yMax = d3.max(allData, (point) => point.energy) ?? 1;

        if (xExtent[0] === undefined || xExtent[1] === undefined) {
            return;
        }

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg
            .attr('width', width + MARGIN.left + MARGIN.right)
            .attr('height', height + MARGIN.top + MARGIN.bottom);

        const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        const xScale = d3.scaleLinear().domain([xExtent[0], xExtent[1]]).range([0, width]);
        const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).nice().range([height, 0]);

        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(() => ''))
            .call((axis) => axis.select('.domain').remove())
            .call((axis) => axis.selectAll('.tick line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '4,4'));

        const defs = svg.append('defs');

        const gradientA = defs
            .append('linearGradient')
            .attr('id', 'timeseries-gradient-a')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', height);

        gradientA.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.3);
        gradientA.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.01);

        const gradientB = defs
            .append('linearGradient')
            .attr('id', 'timeseries-gradient-b')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', height);

        gradientB.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.25);
        gradientB.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.01);

        defs.append('clipPath')
            .attr('id', 'timeseries-clip')
            .append('rect')
            .attr('width', width)
            .attr('height', height);

        const chartArea = g.append('g').attr('clip-path', 'url(#timeseries-clip)');

        const lineGenerator = d3
            .line<TelemetryPoint>()
            .x((point) => xScale(point.nodeIndex))
            .y((point) => yScale(point.energy))
            .curve(d3.curveCatmullRom.alpha(0.5));

        const areaGenerator = d3
            .area<TelemetryPoint>()
            .x((point) => xScale(point.nodeIndex))
            .y0(height)
            .y1((point) => yScale(point.energy))
            .curve(d3.curveCatmullRom.alpha(0.5));

        chartArea.append('path').datum(dataA).attr('fill', 'url(#timeseries-gradient-a)').attr('d', areaGenerator);
        chartArea
            .append('path')
            .datum(dataA)
            .attr('fill', 'none')
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 1.5)
            .attr('d', lineGenerator)
            .attr('filter', 'drop-shadow(0 0 4px rgba(59,130,246,0.4))');

        if (showBoth && dataB.length > 0) {
            chartArea.append('path').datum(dataB).attr('fill', 'url(#timeseries-gradient-b)').attr('d', areaGenerator);
            chartArea
                .append('path')
                .datum(dataB)
                .attr('fill', 'none')
                .attr('stroke', '#10b981')
                .attr('stroke-width', 1.5)
                .attr('d', lineGenerator)
                .attr('filter', 'drop-shadow(0 0 4px rgba(16,185,129,0.4))');
        }

        const spikes = dataA.filter((point) => point.energy > yMax * 0.75).slice(0, 8);

        chartArea
            .selectAll('.spike')
            .data(spikes)
            .join('circle')
            .attr('cx', (point) => xScale(point.nodeIndex))
            .attr('cy', (point) => yScale(point.energy))
            .attr('r', 3)
            .attr('fill', '#ef4444')
            .attr('opacity', 0.9)
            .attr('filter', 'drop-shadow(0 0 6px rgba(239,68,68,0.5))');

        const xAxis = g
            .append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(6).tickFormat((value) => `L${Number(value).toFixed(0)}`));

        xAxis.call((axis) => axis.select('.domain').attr('stroke', '#cbd5e1'));
        xAxis.call((axis) => axis.selectAll('.tick line').attr('stroke', '#cbd5e1'));
        xAxis.call((axis) =>
            axis
                .selectAll('.tick text')
                .attr('fill', '#64748b')
                .attr('font-size', '10px')
                .attr('font-family', 'JetBrains Mono, monospace')
        );

        const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat((value) => `${Number(value)}J`));
        yAxis.call((axis) => axis.select('.domain').attr('stroke', '#cbd5e1'));
        yAxis.call((axis) => axis.selectAll('.tick line').attr('stroke', '#cbd5e1'));
        yAxis.call((axis) =>
            axis
                .selectAll('.tick text')
                .attr('fill', '#64748b')
                .attr('font-size', '10px')
                .attr('font-family', 'JetBrains Mono, monospace')
        );

        const crosshairV = g
            .append('line')
            .attr('stroke', 'rgba(59,130,246,0.4)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,4')
            .attr('y1', 0)
            .attr('y2', height)
            .style('opacity', 0);

        const crosshairH = g
            .append('line')
            .attr('stroke', 'rgba(59,130,246,0.2)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,4')
            .attr('x1', 0)
            .attr('x2', width)
            .style('opacity', 0);

        g.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('mousemove', (event) => {
                const [mouseX] = d3.pointer(event);
                const nodeIndex = xScale.invert(mouseX);

                const closest = dataA.reduce((best, point) => (
                    Math.abs(point.nodeIndex - nodeIndex) < Math.abs(best.nodeIndex - nodeIndex) ? point : best
                ));

                crosshairV.attr('x1', mouseX).attr('x2', mouseX).style('opacity', 1);
                crosshairH.attr('y1', yScale(closest.energy)).attr('y2', yScale(closest.energy)).style('opacity', 1);

                const tooltip = tooltipRef.current;
                const host = containerRef.current;
                if (!tooltip || !host) {
                    return;
                }

                const parentRect = host.getBoundingClientRect();
                tooltip.style.display = 'block';
                tooltip.style.left = `${event.clientX - parentRect.left + 14}px`;
                tooltip.style.top = `${event.clientY - parentRect.top - 10}px`;
                tooltip.innerHTML = [
                    `<div class=\"text-blue-700 font-bold\">${closest.functionName}</div>`,
                    `<div>Energy: <span class=\"text-orange-500\">${closest.energy.toFixed(3)}J</span></div>`,
                    `<div>CPU: <span class=\"text-red-500\">${closest.cpuCore.toFixed(1)}W</span></div>`,
                    `<div>DRAM: <span class=\"text-indigo-600\">${closest.dramLatency.toFixed(1)}ns</span></div>`,
                    `<div>Cache: <span class=\"text-emerald-600\">${(closest.cacheHitRate * 100).toFixed(1)}%</span></div>`,
                    `<div>Line: <span class=\"text-amber-500\">${closest.lineId}</span></div>`,
                    `<div class=\"text-xs text-slate-500\">L=${closest.nodeIndex.toFixed(0)}</div>`,
                ].join('');
            })
            .on('mouseleave', () => {
                crosshairV.style('opacity', 0);
                crosshairH.style('opacity', 0);
                if (tooltipRef.current) {
                    tooltipRef.current.style.display = 'none';
                }
            })
            .on('click', (event) => {
                const [mouseX] = d3.pointer(event);
                const nodeIndex = xScale.invert(mouseX);
                const closest = dataA.reduce((best, point) => (
                    Math.abs(point.nodeIndex - nodeIndex) < Math.abs(best.nodeIndex - nodeIndex) ? point : best
                ));
                selectLine(closest.lineId);
            });

        const brush = d3
            .brushX<unknown>()
            .extent([[0, 0], [width, height]])
            .on('end', (event) => {
                const selection = event.selection as [number, number] | null;
                if (!selection) {
                    setTimeWindow(null);
                    return;
                }
                setTimeWindow([xScale.invert(selection[0]), xScale.invert(selection[1])]);
            });

        g.append('g').call(brush);

        const legend = g.append('g').attr('transform', `translate(${width - 150}, 4)`);
        legend.append('line').attr('x1', 0).attr('x2', 20).attr('stroke', '#3b82f6').attr('stroke-width', 2).attr('y1', 6).attr('y2', 6);
        legend.append('text').attr('x', 24).attr('y', 10).attr('fill', '#64748b').attr('font-size', '10px').text('Primary');

        if (showBoth && dataB.length > 0) {
            legend.append('line').attr('x1', 0).attr('x2', 20).attr('stroke', '#10b981').attr('stroke-width', 2).attr('y1', 22).attr('y2', 22);
            legend.append('text').attr('x', 24).attr('y', 26).attr('fill', '#64748b').attr('font-size', '10px').text('Secondary');
        }
    }, [telemetryA, telemetryB, showBoth, selectLine, setTimeWindow]);

    useEffect(() => {
        renderChart();
    }, [renderChart]);

    useEffect(() => {
        const observer = new ResizeObserver(() => renderChart());
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, [renderChart]);

    const hasData = isRunning && telemetryA.length > 0;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Energy Time-Series</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowBoth((previous) => !previous)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${showBoth ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-slate-700/40 text-slate-300'}`}
                    >
                        Compare
                    </button>
                    <span className="text-[10px] font-mono text-slate-400">Click spike {'->'} jump to code</span>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                {isAnalyzing && (
                    <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-2/3 max-w-sm space-y-2">
                            <div className="h-3 rounded bg-slate-800 animate-pulse" />
                            <div className="h-3 rounded bg-slate-800 animate-pulse w-5/6" />
                            <p className="text-center text-xs font-mono text-blue-500">Synthesizing time-series energy trace...</p>
                        </div>
                    </div>
                )}

                {!hasData ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-slate-400 text-sm font-mono text-center"
                        >
                            <div>Run analysis to stream semantic energy data</div>
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

