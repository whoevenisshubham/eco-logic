import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const EnergyComplexityRadar: React.FC = () => {
    const { isRunning, totalEnergyA, astTree } = useTelemetryStore();

    let maxComplexityScore = 0;
    let loopCount = 0;
    let memoryOpsCount = 0;
    let functionCallCount = 0;

    if (isRunning && astTree) {
        astTree.forEach((node) => {
            let nodeScore = 10;
            switch (node.complexity) {
                case 'O(1)': nodeScore = 10; break;
                case 'O(log N)': nodeScore = 20; break;
                case 'O(N)': nodeScore = 40; break;
                case 'O(N log N)': nodeScore = 60; break;
                case 'O(N^2)': nodeScore = 80; break;
                case 'O(2^N)': nodeScore = 100; break;
            }
            if (nodeScore > maxComplexityScore) {
                maxComplexityScore = nodeScore;
            }

            if (node.nodeType === 'ForLoop' || node.nodeType === 'WhileLoop') {
                loopCount += 1;
            } else if (node.nodeType === 'Assignment' || node.nodeType === 'ListComp') {
                memoryOpsCount += 1;
            } else if (node.nodeType === 'Call') {
                functionCallCount += 1;
            }
        });
    }

    const radarData = [
        { subject: 'AST Depth', A: maxComplexityScore, fullMark: 100 },
        { subject: 'Loop Pressure', A: Math.min(100, loopCount * 10), fullMark: 100 },
        { subject: 'Memory Ops', A: Math.min(100, memoryOpsCount * 5), fullMark: 100 },
        { subject: 'Function Calls', A: Math.min(100, functionCallCount * 8), fullMark: 100 },
        { subject: 'Energy Footprint', A: Math.min(100, totalEnergyA > 0 ? (totalEnergyA / Math.max(totalEnergyA, 10)) * 100 : 0), fullMark: 100 },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header drag-handle cursor-grab active:cursor-grabbing">
                <span className="panel-title">Energy vs. Complexity Radar</span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Footprint</span>
            </div>
            {/* FIX: Added min-h-0 min-w-0 to prevent flex layout collapse during grid resize */}
            <div className="flex-1 p-5 min-h-0 min-w-0">
                {isRunning ? (
                    /* FIX: Added minWidth and minHeight to silence the Recharts -1 warning */
                    <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <PolarGrid stroke="#e2e8f0" strokeWidth={1.5} />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Primary Execution" dataKey="A" stroke="#0ea5e9" strokeWidth={2.5} fill="#4f46e5" fillOpacity={0.15} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', color: '#334155', padding: '12px', fontWeight: 500, fontSize: '12px' }} 
                                itemStyle={{ color: '#0ea5e9', fontWeight: 700 }} 
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-[13px] text-slate-400 font-medium">
                        Run analysis to view footprint radar
                    </div>
                )}
            </div>
        </div>
    );
};
