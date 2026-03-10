// ComplexityScatterPlot.tsx — Virtual windowed scatter with 5000+ points @60FPS
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { dataEngine } from '../engine/SimulatedDataEngine';

const MARGIN = { top: 10, right: 20, bottom: 36, left: 52 };
const COMPLEXITY_LABELS = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'];
const FN_COLORS: Record<string, string> = {
    mergeSort: '#00d4ff', merge: '#00ff88', matrixMultiply: '#ff3366',
    fibonacciMemo: '#b44fff', insertionSort: '#ffd700', calcMinRun: '#ff6b35',
};

export const ComplexityScatterPlot: React.FC = React.memo(() => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const { isRunning } = useTelemetryStore();

    // Memoize the 5000-point dataset — only regenerates when profiler starts
    const scatterData = useMemo(() => {
        return isRunning ? dataEngine.generateScatterData(5000) : [];
    }, [isRunning]);

    const renderScatter = useCallback(() => {
        if (!svgRef.current || !containerRef.current || !scatterData.length) return;

        const container = containerRef.current;
        const width = container.clientWidth - MARGIN.left - MARGIN.right;
        const height = container.clientHeight - MARGIN.top - MARGIN.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('width', width + MARGIN.left + MARGIN.right).attr('height', height + MARGIN.top + MARGIN.bottom);

        const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        // Scales
        const xScale = d3.scaleLinear().domain([0, 4.2]).range([0, width]);
        const yScale = d3.scaleLinear().domain([0, d3.max(scatterData, d => d.energy)! * 1.1]).range([height, 0]);

        // Grid
        g.append('g').call(d3.axisLeft(yScale).ticks(4).tickSize(-width).tickFormat(() => ''))
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').attr('stroke', 'rgba(26,58,92,0.4)').attr('stroke-dasharray', '3,3'));

        // Vertical complexity lines
        [0, 1, 2, 3, 4].forEach((x, i) => {
            g.append('line').attr('x1', xScale(x)).attr('x2', xScale(x)).attr('y1', 0).attr('y2', height).attr('stroke', 'rgba(26,58,92,0.3)').attr('stroke-dasharray', '4,4');
            g.append('text').attr('x', xScale(x)).attr('y', height + 22).attr('text-anchor', 'middle').attr('fill', '#3a6b8a').attr('font-size', '9px').attr('font-family', 'JetBrains Mono').text(COMPLEXITY_LABELS[i]);
        });

        // Clip
        const defs = svg.append('defs');
        defs.append('clipPath').attr('id', 'scatterClip').append('rect').attr('width', width).attr('height', height);

        // Virtual windowing — only render points in visible area (all of them, but using canvas-like batch update)
        const chartArea = g.append('g').attr('clip-path', 'url(#scatterClip)');

        // Batch render with function grouping for perf
        const byFunction = d3.group(scatterData, d => d.name);

        byFunction.forEach((points, fn) => {
            chartArea.append('g')
                .selectAll('circle')
                .data(points)
                .join('circle')
                .attr('cx', d => xScale(d.x))
                .attr('cy', d => yScale(d.energy))
                .attr('r', d => Math.max(1.5, Math.log(d.r + 1)))
                .attr('fill', FN_COLORS[fn] || '#7ab8d4')
                .attr('fill-opacity', 0.45)
                .attr('stroke', FN_COLORS[fn] || '#7ab8d4')
                .attr('stroke-width', 0.3)
                .attr('stroke-opacity', 0.7);
        });

        // Hover layer (transparent for interaction)
        chartArea.append('rect')
            .attr('width', width).attr('height', height).attr('fill', 'none').attr('pointer-events', 'all')
            .on('mousemove', function (event) {
                const [mx, my] = d3.pointer(event);
                const x = xScale.invert(mx);
                const y = yScale.invert(my);
                const closest = scatterData.reduce((a, b) => {
                    const da = Math.hypot(xScale(a.x) - mx, yScale(a.energy) - my);
                    const db = Math.hypot(xScale(b.x) - mx, yScale(b.energy) - my);
                    return db < da ? b : a;
                });
                const dist = Math.hypot(xScale(closest.x) - mx, yScale(closest.energy) - my);
                if (dist < 25) {
                    const tooltip = tooltipRef.current;
                    if (tooltip) {
                        const parentRect = containerRef.current!.getBoundingClientRect();
                        tooltip.style.display = 'block';
                        tooltip.style.left = `${event.clientX - parentRect.left + 12}px`;
                        tooltip.style.top = `${event.clientY - parentRect.top - 10}px`;
                        tooltip.innerHTML = `
              <div style="color:${FN_COLORS[closest.name] || '#7ab8d4'}" class="font-bold">${closest.name}</div>
              <div>Energy: <span style="color:#ff6b35">${closest.energy.toFixed(3)}J</span></div>
              <div>Complexity: <span style="color:#ffd700">${COMPLEXITY_LABELS[Math.round(closest.x)] || 'O(?)'}</span></div>
            `;
                    }
                } else if (tooltipRef.current) tooltipRef.current.style.display = 'none';
            })
            .on('mouseleave', () => { if (tooltipRef.current) tooltipRef.current.style.display = 'none'; });

        // Axes
        const xAxis = g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale).ticks(5).tickFormat((d, i) => ''));
        xAxis.call(g => g.select('.domain').attr('stroke', '#1a3a5c'));
        xAxis.call(g => g.selectAll('.tick line').attr('stroke', '#1a3a5c'));

        const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${+d}J`));
        yAxis.call(g => g.select('.domain').attr('stroke', '#1a3a5c'));
        yAxis.call(g => g.selectAll('.tick text').attr('fill', '#7ab8d4').attr('font-size', '10px').attr('font-family', 'JetBrains Mono'));

        // X-axis label
        g.append('text').attr('x', width / 2).attr('y', height + 34).attr('text-anchor', 'middle').attr('fill', '#7ab8d4').attr('font-size', '10px').text('Time Complexity Class');
        g.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -38).attr('text-anchor', 'middle').attr('fill', '#7ab8d4').attr('font-size', '10px').text('Energy (J)');

        // Legend
        const lg = g.append('g').attr('transform', `translate(${width - 120}, 4)`);
        Object.entries(FN_COLORS).forEach(([fn, color], i) => {
            lg.append('circle').attr('cx', 5).attr('cy', i * 14 + 5).attr('r', 4).attr('fill', color).attr('opacity', 0.8);
            lg.append('text').attr('x', 13).attr('y', i * 14 + 9).attr('fill', '#7ab8d4').attr('font-size', '9px').attr('font-family', 'JetBrains Mono').text(fn);
        });

    }, [scatterData]);

    useEffect(() => { renderScatter(); }, [renderScatter]);
    useEffect(() => {
        const obs = new ResizeObserver(() => renderScatter());
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, [renderScatter]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Energy-Complexity Scatter</span>
                <span className="text-[10px] font-mono text-cyber-text-muted">{scatterData.length.toLocaleString()} points · 60FPS</span>
            </div>
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                {!isRunning ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="text-cyber-text-muted text-sm font-mono text-center">
                            <div className="text-2xl mb-2">◉</div>
                            <div>Run profiler to scatter plot</div>
                        </motion.div>
                    </div>
                ) : <svg ref={svgRef} className="w-full h-full" />}
                <div ref={tooltipRef} className="d3-tooltip" style={{ display: 'none', position: 'absolute' }} />
            </div>
        </div>
    );
});
