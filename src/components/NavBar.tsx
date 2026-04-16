import React from 'react';
import { Activity, Play, Square, Zap, GitBranch, Cloud, Cpu, Flame, Target } from 'lucide-react';
import { useTelemetryStore, type ProfilerMode } from '../store/useTelemetryStore';

export const NavBar: React.FC = () => {
    const { mode, setMode, isRunning, isAnalyzing, runProfiler, stopProfiler, totalEnergyA, peakPowerA, avgCacheHitA } = useTelemetryStore();

    const modes: { id: ProfilerMode; label: string; icon: React.ReactNode }[] = [
        { id: 'live', label: 'Live Profiler', icon: <Activity size={14} /> },
        { id: 'flame', label: 'Flame Graph', icon: <Flame size={14} /> },
        { id: 'sunburst', label: 'Sunburst', icon: <Target size={14} /> },
        { id: 'scatter', label: 'Scatter', icon: <GitBranch size={14} /> },
        { id: 'differential', label: 'Differential', icon: <Cpu size={14} /> },
        { id: 'enterprise', label: 'Enterprise', icon: <Cloud size={14} /> },
    ];

    return (
        <nav className="flex-none h-14 border-b border-gray-200/40 flex items-center justify-between px-4 bg-white/50 backdrop-blur-md z-10">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Zap className="text-indigo-600" size={20} />
                    <span className="font-bold text-lg tracking-wider text-white">Eco<span className="text-indigo-600">-Logic</span></span>
                </div>
                <div className="flex items-center gap-1 bg-white/50 p-1 rounded-lg border border-gray-200/30">
                    {modes.map(m => (
                        <button 
                            key={m.id} 
                            onClick={() => setMode(m.id)} 
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${mode === m.id ? 'bg-indigo-600/20 text-indigo-600 border border-indigo-600/30 shadow-[0_0_10px_rgba(0,212,255,0.2)]' : 'text-gray-600 hover:text-white hover:bg-white'}`}
                        >
                            {m.icon} {m.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4">
                {isRunning && (
                    <div className="flex items-center gap-4 mr-4 text-xs font-mono">
                        <div className="flex flex-col"><span className="text-gray-600">Total Energy</span><span className="text-orange-500">{totalEnergyA.toFixed(2)} J</span></div>
                        <div className="flex flex-col"><span className="text-gray-600">Peak Power</span><span className="text-red-500">{peakPowerA.toFixed(1)} W</span></div>
                        <div className="flex flex-col"><span className="text-gray-600">Avg Cache Hit</span><span className="text-emerald-500">{(avgCacheHitA * 100).toFixed(1)}%</span></div>
                    </div>
                )}
                {isRunning ? (
                    <button onClick={stopProfiler} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all shadow-[0_0_10px_rgba(255,51,102,0.2)]">
                        <Square size={14} fill="currentColor" /> Stop Profiler
                    </button>
                ) : (
                    <button onClick={runProfiler} disabled={isAnalyzing} className="flex items-center gap-2 bg-indigo-600 border border-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600/90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(0,212,255,0.4)]">
                        <Play size={14} fill="currentColor" /> {isAnalyzing ? 'Analyzing...' : 'Run Profiler'}
                    </button>
                )}
            </div>
        </nav>
    );
};

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="flex flex-col items-center">
        <span className="text-[9px] text-gray-600 tracking-widest">{label}</span>
        <span className={`${color} font-bold`}>{value}</span>
    </div>
);

