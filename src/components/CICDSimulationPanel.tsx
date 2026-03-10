// CICDSimulationPanel.tsx — CI/CD Hardware simulation: ARMv8 vs x86 predictions
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { Server, Cpu, Zap, TrendingDown, Clock, MemoryStick } from 'lucide-react';

interface HardwarePlatform {
    id: string;
    name: string;
    arch: string;
    cores: number;
    freq: string;
    tdp: string;
    energyFactor: number;
    speedFactor: number;
    cost: string;
    color: string;
    icon: string;
}

const PLATFORMS: HardwarePlatform[] = [
    { id: 'current', name: 'Current (Intel i9)', arch: 'x86-64', cores: 24, freq: '5.6GHz', tdp: '253W', energyFactor: 1.0, speedFactor: 1.0, cost: '$589', color: '#00d4ff', icon: '🖥️' },
    { id: 'armv8', name: 'AWS Graviton3', arch: 'ARMv8.4', cores: 64, freq: '2.6GHz', tdp: '55W', energyFactor: 0.38, speedFactor: 0.82, cost: '$0.068/hr', color: '#00ff88', icon: '☁️' },
    { id: 'apple_m3', name: 'Apple M3 Pro', arch: 'ARMv9', cores: 12, freq: '4.05GHz', tdp: '30W', energyFactor: 0.29, speedFactor: 0.95, cost: '$1999', color: '#b44fff', icon: '🍎' },
    { id: 'amd_epyc', name: 'AMD EPYC 9654', arch: 'x86-64 (Zen4)', cores: 96, freq: '3.55GHz', tdp: '360W', energyFactor: 1.15, speedFactor: 1.45, cost: '$11,805', color: '#ff6b35', icon: '⚡' },
    { id: 'risc_v', name: 'SiFive P550', arch: 'RISC-V', cores: 4, freq: '1.5GHz', tdp: '8W', energyFactor: 0.22, speedFactor: 0.35, cost: '$99', color: '#ffd700', icon: '🔬' },
];

export const CICDSimulationPanel: React.FC = () => {
    const { totalEnergyA, isRunning } = useTelemetryStore();
    const [selectedPlatform, setSelectedPlatform] = useState<string>('current');
    const selected = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];
    const baseline = PLATFORMS[0];

    const estimatedEnergy = totalEnergyA * selected.energyFactor;
    const energySaving = ((1 - selected.energyFactor) * 100).toFixed(1);
    const speedFactor = selected.speedFactor;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <div className="flex items-center gap-2">
                    <Server size={14} className="text-cyber-accent" />
                    <span className="panel-title">CI/CD Hardware Simulator</span>
                </div>
                <span className="text-[10px] font-mono text-cyber-text-muted">Cross-arch Energy Estimation</span>
            </div>

            {!isRunning ? (
                <div className="flex-1 flex items-center justify-center text-cyber-text-muted text-xs font-mono">Run profiler to simulate hardware</div>
            ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* Platform Cards */}
                    <div className="grid grid-cols-1 gap-2">
                        {PLATFORMS.map(platform => (
                            <motion.button
                                key={platform.id}
                                whileHover={{ scale: 1.01 }}
                                onClick={() => setSelectedPlatform(platform.id)}
                                className="w-full text-left p-2.5 rounded-lg border transition-all"
                                style={{
                                    borderColor: selectedPlatform === platform.id ? `${platform.color}50` : 'rgba(26,58,92,0.4)',
                                    background: selectedPlatform === platform.id ? `${platform.color}0d` : 'rgba(8,15,26,0.6)',
                                }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span>{platform.icon}</span>
                                        <span className="text-xs font-semibold" style={{ color: platform.color }}>{platform.name}</span>
                                        <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: `${platform.color}22`, color: platform.color }}>{platform.arch}</span>
                                    </div>
                                    <span className="text-[9px] font-mono" style={{ color: platform.color }}>{platform.tdp} TDP</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-mono text-cyber-text-muted">
                                    <span><Cpu size={8} className="inline mr-1" />{platform.cores}C @ {platform.freq}</span>
                                    <span className={platform.energyFactor < 1 ? 'text-cyber-green' : 'text-cyber-red'}>
                                        {platform.energyFactor < 1 ? '↓' : '↑'}{Math.abs((1 - platform.energyFactor) * 100).toFixed(0)}% energy
                                    </span>
                                    <span>{platform.speedFactor > 1 ? '↑' : '↓'}{Math.abs((platform.speedFactor - 1) * 100).toFixed(0)}% speed</span>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {/* Detailed estimates */}
                    <motion.div
                        key={selectedPlatform}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg border space-y-2"
                        style={{ borderColor: `${selected.color}30`, background: `${selected.color}08` }}
                    >
                        <div className="text-xs font-semibold" style={{ color: selected.color }}>
                            {selected.icon} Estimated on {selected.name}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Metric label="Energy" value={`${estimatedEnergy.toFixed(3)}J`} sub={`vs ${totalEnergyA.toFixed(3)}J baseline`} color={selected.color} icon={<Zap size={10} />} />
                            <Metric label="Savings" value={`${parseFloat(energySaving) > 0 ? '-' : '+'}${Math.abs(parseFloat(energySaving)).toFixed(1)}%`} sub="vs x86-64" color={parseFloat(energySaving) > 0 ? '#00ff88' : '#ff3366'} icon={<TrendingDown size={10} />} />
                            <Metric label="Speed" value={`${speedFactor.toFixed(2)}×`} sub="relative throughput" color="#ffd700" icon={<Clock size={10} />} />
                            <Metric label="Est. Cost" value={selected.cost} sub="hardware/cloud" color="#4fc3f7" icon={<Server size={10} />} />
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

const Metric: React.FC<{ label: string; value: string; sub: string; color: string; icon: React.ReactNode }> = ({ label, value, sub, color, icon }) => (
    <div className="p-2 rounded-lg bg-cyber-bg/60 border border-cyber-border/30">
        <div className="flex items-center gap-1 text-[9px] text-cyber-text-muted mb-1">{icon}{label}</div>
        <div className="text-sm font-mono font-bold" style={{ color }}>{value}</div>
        <div className="text-[9px] text-cyber-text-muted">{sub}</div>
    </div>
);
