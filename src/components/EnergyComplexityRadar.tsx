import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const EnergyComplexityRadar: React.FC = () => {
    const { isRunning, totalEnergyA, peakPowerA } = useTelemetryStore();

    // Derive realistic mock metrics based on actual energy data for the radar chart
    const radarData = [
        { subject: 'AST Depth', A: Math.min(100, isRunning ? 20 + peakPowerA * 2 : 0), fullMark: 100 },
        { subject: 'Loop Pressure', A: Math.min(100, isRunning ? 10 + totalEnergyA * 2 : 0), fullMark: 100 },
        { subject: 'Memory Ops', A: Math.min(100, totalEnergyA * 5), fullMark: 100 },
        { subject: 'Function Calls', A: Math.min(100, isRunning ? 30 + peakPowerA : 0), fullMark: 100 },
        { subject: 'Total Joules', A: Math.min(100, totalEnergyA * 10), fullMark: 100 },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Energy/Complexity Radar</span>
            </div>
            {/* FIX: Added min-h-0 min-w-0 to prevent flex layout collapse during grid resize */}
            <div className="flex-1 p-2 min-h-0 min-w-0">
                {isRunning ? (
                    /* FIX: Added minWidth and minHeight to silence the Recharts -1 warning */
                    <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Primary Execution" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', color: '#334155', padding: '12px' }} 
                                itemStyle={{ color: '#6366f1' }} 
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
                        Run analysis to view footprint radar
                    </div>
                )}
            </div>
        </div>
    );
};
