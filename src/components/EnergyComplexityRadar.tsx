import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const EnergyComplexityRadar: React.FC = () => {
    const { isRunning, totalEnergyA, peakPowerA } = useTelemetryStore();

    const radarData = [
        { subject: 'CPU Pressure', A: Math.min(100, peakPowerA * 10), fullMark: 100 },
        { subject: 'Memory Ops', A: Math.min(100, totalEnergyA * 5), fullMark: 100 },
        { subject: 'Branch Misses', A: isRunning ? 30 : 0, fullMark: 100 },
        { subject: 'Cache Misses', A: isRunning ? 45 : 0, fullMark: 100 },
        { subject: 'Thermal Throttle', A: isRunning ? 15 : 0, fullMark: 100 },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Energy/Complexity Radar</span>
            </div>
            <div className="flex-1 p-2 relative w-full overflow-hidden min-h-0">
                {isRunning ? (
                    <div className="absolute inset-0 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="rgba(26,58,92,0.5)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#7ab8d4', fontSize: 10, fontFamily: 'monospace' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Primary Execution" dataKey="A" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.3} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'rgba(8,15,26,0.9)', border: '1px solid #1a3a5c', borderRadius: '8px' }} 
                                    itemStyle={{ color: '#00d4ff' }} 
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-cyber-text-muted font-mono">
                        Run analysis to view footprint radar
                    </div>
                )}
            </div>
        </div>
    );
};


