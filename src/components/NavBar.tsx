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
        <nav className="flex-none h-[68px] bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-8 flex items-center justify-between z-10" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                    <Zap className="text-indigo-600" size={24} />
                    <span className="font-bold text-xl tracking-tight text-slate-800">Eco<span className="text-indigo-600 font-extrabold">-Logic</span></span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100/60 p-1.5 rounded-xl border border-slate-200/60">
                    {modes.map(m => (
                        <button 
                            key={m.id} 
                            onClick={() => setMode(m.id)} 
                            className={`px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 transition-all ${mode === m.id ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'}`}
                        >
                            {m.icon} {m.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-6">
                {isRunning && (
                    <div className="flex items-center gap-6 mr-4 text-sm font-medium">
                        <div className="flex flex-col"><span className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Total Energy</span><span className="text-orange-500">{totalEnergyA.toFixed(2)} J</span></div>
                        <div className="flex flex-col"><span className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Peak Power</span><span className="text-rose-500">{peakPowerA.toFixed(1)} W</span></div>
                        <div className="flex flex-col"><span className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Avg Cache Hit</span><span className="text-emerald-500">{(avgCacheHitA * 100).toFixed(1)}%</span></div>
                    </div>
                )}
                {isRunning ? (
                    <button onClick={stopProfiler} className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-500/20 transition-all shadow-sm">
                        <Square size={16} fill="currentColor" /> Stop Profiler
                    </button>
                ) : (
                    <button onClick={runProfiler} disabled={isAnalyzing} className="flex items-center gap-2.5 bg-indigo-600 border border-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:bg-indigo-400 disabled:border-indigo-400 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.25)]">
                        <Play size={16} fill="currentColor" /> {isAnalyzing ? 'Analyzing...' : 'Run Profiler'}
                    </button>
                )}
            </div>
        </nav>
    );
};

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="flex flex-col items-center">
        <span className="text-xs text-gray-600 tracking-widest">{label}</span>
        <span className={`${color} font-bold`}>{value}</span>
    </div>
);

