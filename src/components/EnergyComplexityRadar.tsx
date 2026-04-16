import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const EnergyComplexityRadar: React.FC = () => {
    const { isRunning, totalEnergyA, peakPowerA } = useTelemetryStore();

    // Derive realistic mock metrics based on actual energy data for the radar chart
    const radarData = [
        { subject: 'AST Depth', A: Math.min(100, isRunning ? 20 + peakPowerA * 2 : 0), fullMark: 100 },
        { subject: 'Loop Pressure', A: Math.min(100, isRunning ? 10 + totalEnergyA * 2 : 0), fullMark: 100 },
        { subject: 'Memory Ops Proxy', A: Math.min(100, totalEnergyA * 5), fullMark: 100 },
        { subject: 'Total Joules', A: Math.min(100, totalEnergyA * 10), fullMark: 100 },
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
                            <Radar name="Primary Execution" dataKey="A" stroke="#4f46e5" strokeWidth={2.5} fill="#4f46e5" fillOpacity={0.15} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', color: '#334155', padding: '12px', fontWeight: 500, fontSize: '12px' }} 
                                itemStyle={{ color: '#4f46e5', fontWeight: 700 }} 
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
