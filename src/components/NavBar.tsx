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
        <nav className="flex-none h-14 border-b border-cyber-border/40 flex items-center justify-between px-4 bg-cyber-surface/50 backdrop-blur-md z-10">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Zap className="text-cyber-accent" size={20} />
                    <span className="font-bold text-lg tracking-wider text-white">Eco<span className="text-cyber-accent">-Logic</span></span>
                </div>
                <div className="flex items-center gap-1 bg-cyber-bg/50 p-1 rounded-lg border border-cyber-border/30">
                    {modes.map(m => (
                        <button 
                            key={m.id} 
                            onClick={() => setMode(m.id)} 
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${mode === m.id ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30 shadow-[0_0_10px_rgba(0,212,255,0.2)]' : 'text-cyber-text-muted hover:text-white hover:bg-cyber-panel'}`}
                        >
                            {m.icon} {m.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4">
                {isRunning && (
                    <div className="flex items-center gap-4 mr-4 text-xs font-mono">
                        <div className="flex flex-col"><span className="text-cyber-text-muted">Total Energy</span><span className="text-cyber-orange">{totalEnergyA.toFixed(2)} J</span></div>
                        <div className="flex flex-col"><span className="text-cyber-text-muted">Peak Power</span><span className="text-cyber-red">{peakPowerA.toFixed(1)} W</span></div>
                        <div className="flex flex-col"><span className="text-cyber-text-muted">Avg Cache Hit</span><span className="text-cyber-green">{(avgCacheHitA * 100).toFixed(1)}%</span></div>
                    </div>
                )}
                {isRunning ? (
                    <button onClick={stopProfiler} className="flex items-center gap-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-cyber-red/20 transition-all shadow-[0_0_10px_rgba(255,51,102,0.2)]">
                        <Square size={14} fill="currentColor" /> Stop Profiler
                    </button>
                ) : (
                    <button onClick={runProfiler} disabled={isAnalyzing} className="flex items-center gap-2 bg-cyber-accent border border-cyber-accent text-cyber-bg px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-cyber-accent/90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(0,212,255,0.4)]">
                        <Play size={14} fill="currentColor" /> {isAnalyzing ? 'Analyzing...' : 'Run Profiler'}
                    </button>
                )}
            </div>
        </nav>
    );
};

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="flex flex-col items-center">
        <span className="text-[9px] text-cyber-text-muted tracking-widest">{label}</span>
        <span className={`${color} font-bold`}>{value}</span>
    </div>
);
