// NavBar.tsx — Top navigation with mode switcher and live telemetry stats
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, GitCompare, Flame, PieChart, ScatterChart, Server, Play, Square, Cpu } from 'lucide-react';
import type { ProfilerMode } from '../store/useTelemetryStore';
import { useTelemetryStore } from '../store/useTelemetryStore';

const MODES: { id: ProfilerMode; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'live', label: 'Live Profile', icon: <Activity size={14} />, color: 'text-cyber-accent' },
    { id: 'differential', label: 'Differential', icon: <GitCompare size={14} />, color: 'text-cyber-purple' },
    { id: 'flame', label: 'Flame Graph', icon: <Flame size={14} />, color: 'text-cyber-orange' },
    { id: 'sunburst', label: 'Sunburst', icon: <PieChart size={14} />, color: 'text-cyber-green' },
    { id: 'scatter', label: 'Complexity', icon: <ScatterChart size={14} />, color: 'text-cyber-yellow' },
    { id: 'enterprise', label: 'Enterprise', icon: <Server size={14} />, color: 'text-cyber-red' },
];

export const NavBar: React.FC = () => {
    const { mode, setMode, isRunning, runProfiler, stopProfiler, totalEnergyA, peakPowerA, joulesDelta, avgCacheHitA } = useTelemetryStore();

    return (
        <motion.header
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex-none h-14 flex items-center px-4 gap-4 border-b border-cyber-border/40"
            style={{ background: 'rgba(8,15,26,0.98)', backdropFilter: 'blur(20px)' }}
        >
            {/* Logo */}
            <div className="flex items-center gap-2 mr-2">
                <div className="relative">
                    <Zap size={22} className="text-cyber-accent" style={{ filter: 'drop-shadow(0 0 8px #00d4ff)' }} />
                    <div className="absolute inset-0 animate-pulse-glow" />
                </div>
                <div>
                    <span className="text-base font-bold tracking-tight text-white">Eco</span>
                    <span className="text-base font-bold tracking-tight text-cyber-accent">Logic</span>
                </div>
                <span className="text-[10px] text-cyber-accent/50 font-mono border border-cyber-accent/20 px-1.5 py-0.5 rounded">v2.0 RESEARCH</span>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(26,58,92,0.6)' }}>
                {MODES.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${mode === m.id
                            ? `${m.color} bg-cyber-surface`
                            : 'text-cyber-text-secondary hover:text-white'
                            }`}
                        style={mode === m.id ? { boxShadow: '0 0 12px rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.2)' } : { border: '1px solid transparent' }}
                    >
                        {m.icon}
                        <span className="hidden lg:inline">{m.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1" />

            {/* Live Stats Bar */}
            {isRunning && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-4 text-xs font-mono"
                >
                    <Stat label="ENERGY" value={`${totalEnergyA.toFixed(2)}J`} color="text-cyber-accent" />
                    <Stat label="PEAK" value={`${peakPowerA.toFixed(0)}W`} color="text-cyber-orange" />
                    <Stat label="CACHE" value={`${(avgCacheHitA * 100).toFixed(0)}%`} color="text-cyber-green" />
                    <Stat label="ΔJOULES" value={`${joulesDelta > 0 ? '+' : ''}${joulesDelta.toFixed(2)}J`} color={joulesDelta > 0 ? 'text-cyber-red' : 'text-cyber-green'} />
                </motion.div>
            )}

            {/* Run / Stop */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => isRunning ? stopProfiler() : runProfiler()}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${isRunning
                        ? 'bg-cyber-red/20 border border-cyber-red/40 text-cyber-red hover:bg-cyber-red/30'
                        : 'bg-cyber-green/20 border border-cyber-green/40 text-cyber-green hover:bg-cyber-green/30 hover:shadow-glow-green'
                        }`}
                >
                    {isRunning ? <><Square size={12} /> Stop</> : <><Play size={12} /> Run Profiler</>}
                </button>
                <div className="live-indicator">
                    {isRunning ? (
                        <><div className="live-dot" /><span className="text-[10px] font-mono text-cyber-green">LIVE</span></>
                    ) : (
                        <><div className="w-2 h-2 rounded-full bg-cyber-border" /><span className="text-[10px] font-mono text-cyber-text-muted">IDLE</span></>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 rounded border border-cyber-border/30">
                <Cpu size={12} className="text-cyber-text-secondary" />
                <span className="text-[10px] font-mono text-cyber-text-secondary">x86-64 / Intel i9</span>
            </div>
        </motion.header>
    );
};

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="flex flex-col items-center">
        <span className="text-[9px] text-cyber-text-muted tracking-widest">{label}</span>
        <span className={`${color} font-bold`}>{value}</span>
    </div>
);
