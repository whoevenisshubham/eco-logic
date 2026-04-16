import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';

const MARGIN = { top: 12, right: 24, bottom: 44, left: 66 };
const COMPLEXITY_LABELS = ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)', 'O(N^2)', 'O(2^N)'] as const;

type ComplexityLabel = (typeof COMPLEXITY_LABELS)[number];

interface ComplexityPoint {
    complexity: ComplexityLabel;
    totalEnergy: number;
    timestamp: number;
}

function normalizeComplexity(value: string): ComplexityLabel {
    const normalized = value.trim() as ComplexityLabel;
    if (COMPLEXITY_LABELS.includes(normalized)) {
        return normalized;
    }
    return 'O(1)';
}

export const ComplexityScatterPlot: React.FC = React.memo(() => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const { isRunning, isAnalyzing, complexityMetrics, energyData } = useTelemetryStore();
    const [history, setHistory] = useState<ComplexityPoint[]>([]);

    useEffect(() => {
        const totalEnergy = energyData.totalEnergy;
        if (!isRunning || totalEnergy <= 0) {
            return;
        }

        const nextPoint: ComplexityPoint = {
            complexity: normalizeComplexity(complexityMetrics.overallComplexity),
            totalEnergy,
            timestamp: Date.now(),
        };

        setHistory((previous) => {
            const last = previous[previous.length - 1];
            if (last && last.complexity === nextPoint.complexity && Math.abs(last.totalEnergy - nextPoint.totalEnergy) < 1e-9) {
                return previous;
            }
            return [...previous.slice(-14), nextPoint];
        });
    }, [complexityMetrics.overallComplexity, energyData.totalEnergy, isRunning]);

    const points = useMemo<ComplexityPoint[]>(() => {
        if (history.length > 0) {
            return history;
        }

        if (energyData.totalEnergy <= 0) {
            return [];
        }

        return [{
            complexity: normalizeComplexity(complexityMetrics.overallComplexity),
            totalEnergy: energyData.totalEnergy,
            timestamp: Date.now(),
        }];
    }, [complexityMetrics.overallComplexity, energyData.totalEnergy, history]);

    const renderChart = useCallback(() => {
        if (!svgRef.current || !containerRef.current || !points.length) {
            return;
        }

        const width = containerRef.current.clientWidth - MARGIN.left - MARGIN.right;
        const height = containerRef.current.clientHeight - MARGIN.top - MARGIN.bottom;

        if (width <= 0 || height <= 0) {
            return;
        }

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg
            .attr('width', width + MARGIN.left + MARGIN.right)
            .attr('height', height + MARGIN.top + MARGIN.bottom);

        const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        const xScale = d3
            .scalePoint<ComplexityLabel>()
            .domain(COMPLEXITY_LABELS)
            .range([0, width])
            .padding(0.5);

        const maxEnergy = Math.max(...points.map((point) => point.totalEnergy), 1);
        const yScale = d3.scaleLinear().domain([0, maxEnergy * 1.15]).nice().range([height, 0]);

        g.append('g')
            .call(d3.axisLeft(yScale).ticks(6).tickSize(-width).tickFormat(() => ''))
            .call((axis) => axis.select('.domain').remove())
            .call((axis) => axis.selectAll('.tick line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '4,4'));

        const xAxis = g
            .append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        xAxis.call((axis) => axis.select('.domain').attr('stroke', '#e2e8f0'));
        xAxis.call((axis) => axis.selectAll('.tick line').attr('stroke', '#e2e8f0'));
        xAxis.call((axis) =>
            axis
                .selectAll('.tick text')
                .attr('fill', '#64748b')
                .attr('font-size', '10px')
                .attr('font-family', 'JetBrains Mono, monospace')
        );

        const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(6).tickFormat((value) => `${Number(value).toFixed(2)} J`));
        yAxis.call((axis) => axis.select('.domain').attr('stroke', '#e2e8f0'));
        yAxis.call((axis) => axis.selectAll('.tick line').attr('stroke', '#e2e8f0'));
        yAxis.call((axis) =>
            axis
                .selectAll('.tick text')
                .attr('fill', '#64748b')
                .attr('font-size', '10px')
                .attr('font-family', 'JetBrains Mono, monospace')
        );

        g.append('text')
            .attr('x', width / 2)
            .attr('y', height + 34)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '10px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .text('Overall Complexity');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -46)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '10px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .text('Total Energy (Joules)');

        const newestIndex = points.length - 1;

        g.selectAll<SVGCircleElement, ComplexityPoint>('.complexity-point')
            .data(points, (point) => point.timestamp)
            .join('circle')
            .attr('class', 'complexity-point')
            .attr('cx', (point) => xScale(point.complexity) ?? 0)
            .attr('cy', (point) => yScale(point.totalEnergy))
            .attr('r', (_, index) => (index === newestIndex ? 8 : 5))
            .attr('fill', (_, index) => (index === newestIndex ? '#6366f1' : 'rgba(59,130,246,0.4)'))
            .attr('stroke', '#fffffffff')
            .attr('stroke-width', (_, index) => (index === newestIndex ? 1.4 : 0.8))
            .on('mousemove', (event, point) => {
                const tooltip = tooltipRef.current;
                if (!tooltip || !containerRef.current) {
                    return;
                }

                const parentRect = containerRef.current.getBoundingClientRect();
                tooltip.style.display = 'block';
                tooltip.style.left = `${event.clientX - parentRect.left + 12}px`;
                tooltip.style.top = `${event.clientY - parentRect.top - 10}px`;
                tooltip.innerHTML = [
                    `<div class=\"font-bold text-blue-700\">Semantic Energy Fingerprint</div>`,
                    `<div>Complexity: <span class=\"text-emerald-600\">${point.complexity}</span></div>`,
                    `<div>Total Energy: <span class=\"text-orange-500\">${point.totalEnergy.toFixed(4)} J</span></div>`,
                ].join('');
            })
            .on('mouseleave', () => {
                if (tooltipRef.current) {
                    tooltipRef.current.style.display = 'none';
                }
            });
    }, [points]);

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

    const hasData = isRunning && energyData.totalEnergy > 0;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header drag-handle cursor-grab active:cursor-grabbing border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
                <span className="panel-title font-semibold text-[14px]">Energy-Complexity Scatter</span>
                <span className="text-[11px] font-mono text-gray-500">X: overall Big-O � Y: total Joules</span>
            </div>

            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                {isAnalyzing && (
                    <div className="absolute inset-0 z-20 bg-white/75 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-2/3 max-w-sm space-y-2">
                            <div className="h-3 rounded bg-gray-50 animate-pulse" />
                            <div className="h-3 rounded bg-gray-50 animate-pulse w-5/6" />
                            <p className="text-center text-[13px] font-mono text-indigo-600">Computing complexity-energy projection...</p>
                        </div>
                    </div>
                )}

                {!hasData ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ opacity: [0.45, 1, 0.45] }}
                            transition={{ duration: 1.8, repeat: Infinity }}
                            className="text-gray-500 text-sm font-mono text-center"
                        >
                            <div>Run analysis to plot Big-O vs Joules</div>
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
});

