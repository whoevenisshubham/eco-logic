// DifferentialProfilingView.tsx — Git Diff style side-by-side energy comparison
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { ALGORITHM_CODE } from '../engine/SimulatedDataEngine';
import { TrendingDown, TrendingUp, Minus, Zap, Cpu, Database, GitBranch } from 'lucide-react';

interface DiffMetric {
    label: string;
    valueA: number;
    valueB: number;
    unit: string;
    lower: boolean; // true = lower is better
    icon: React.ReactNode;
}

export const DifferentialProfilingView: React.FC = () => {
    const { algorithmA, algorithmB, totalEnergyA, totalEnergyB, peakPowerA, peakPowerB, avgCacheHitA, avgCacheHitB, isRunning, joulesDelta } = useTelemetryStore();
    const [mounted, setMounted] = useState(false);

    const codeA = ALGORITHM_CODE[algorithmA] || ALGORITHM_CODE.mergesort;
    const codeB = ALGORITHM_CODE[algorithmB] || ALGORITHM_CODE.timsort;

    const metrics: DiffMetric[] = [
        { label: 'Total Energy', valueA: totalEnergyA, valueB: totalEnergyB, unit: 'J', lower: true, icon: <Zap size={12} /> },
        { label: 'Peak Power', valueA: peakPowerA, valueB: peakPowerB, unit: 'W', lower: true, icon: <Cpu size={12} /> },
        { label: 'Cache Hit Rate', valueA: avgCacheHitA * 100, valueB: avgCacheHitB * 100, unit: '%', lower: false, icon: <Database size={12} /> },
        { label: 'Joule Delta', valueA: joulesDelta, valueB: -joulesDelta, unit: 'J', lower: true, icon: <GitBranch size={12} /> },
    ];

    const editorOptions = {
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 11,
        lineHeight: 18,
        fontFamily: "'JetBrains Mono', monospace",
        scrollBeyondLastLine: false,
        folding: false,
        glyphMargin: false,
        lineDecorationsWidth: 0,
        renderLineHighlight: 'line' as const,
        padding: { top: 8, bottom: 8 },
    };

    const winner = totalEnergyA < totalEnergyB ? algorithmA : algorithmB;
    const savings = Math.abs(joulesDelta);
    const savingsPct = totalEnergyA > 0 ? (savings / Math.max(totalEnergyA, totalEnergyB)) * 100 : 0;

    return (
        <div className="h-full flex flex-col gap-2 p-3 overflow-hidden">
            {/* Summary Banner */}
            {isRunning && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-none p-3 rounded-lg border grid grid-cols-4 gap-3"
                    style={{ background: 'rgba(0,255,136,0.05)', borderColor: 'rgba(0,255,136,0.2)' }}
                >
                    {metrics.map((m) => {
                        const diff = m.valueB - m.valueA;
                        const pct = m.valueA !== 0 ? Math.abs(diff / m.valueA) * 100 : 0;
                        const bIsWinner = m.lower ? m.valueB < m.valueA : m.valueB > m.valueA;
                        return (
                            <div key={m.label} className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 text-[10px] text-cyber-text-muted">{m.icon}{m.label}</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-white">{m.valueA.toFixed(2)}{m.unit}</span>
                                    <span className="text-[10px] text-cyber-text-muted">vs</span>
                                    <span className="text-xs font-mono text-white">{m.valueB.toFixed(2)}{m.unit}</span>
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-mono ${bIsWinner ? 'text-cyber-green' : 'text-cyber-red'}`}>
                                    {bIsWinner ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                                    {pct.toFixed(1)}% {bIsWinner ? 'better' : 'worse'}
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            )}

            {/* Joule Savings Delta */}
            {isRunning && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-none text-center py-2 px-4 rounded-lg border"
                    style={{ background: 'rgba(0,212,255,0.05)', borderColor: 'rgba(0,212,255,0.2)' }}
                >
                    <span className="text-xs text-cyber-text-muted">Joule Savings Delta: </span>
                    <span className="text-base font-bold text-cyber-green font-mono">
                        {savings.toFixed(3)} J saved
                    </span>
                    <span className="text-xs text-cyber-text-muted mx-2">|</span>
                    <span className="text-cyber-accent font-mono text-sm">{savingsPct.toFixed(1)}% more efficient</span>
                    <span className="text-xs text-cyber-text-muted mx-2">|</span>
                    <span className="text-cyber-yellow font-mono text-xs">Winner: <strong>{winner === 'timsort' ? 'TimSort' : 'MergeSort'}</strong></span>
                </motion.div>
            )}

            {/* Side-by-side editors */}
            <div className="flex-1 grid grid-cols-2 gap-2 min-h-0 overflow-hidden">
                <EditorPanel
                    title={algorithmA === 'mergesort' ? 'MergeSort' : 'TimSort'}
                    subtitle={`${totalEnergyA.toFixed(2)}J total`}
                    code={codeA}
                    options={editorOptions}
                    color="#00d4ff"
                    isWinner={winner === algorithmA}
                />
                <EditorPanel
                    title={algorithmB === 'timsort' ? 'TimSort' : 'MergeSort'}
                    subtitle={`${totalEnergyB.toFixed(2)}J total`}
                    code={codeB}
                    options={editorOptions}
                    color="#00ff88"
                    isWinner={winner === algorithmB}
                />
            </div>
        </div>
    );
};

const EditorPanel: React.FC<{
    title: string; subtitle: string; code: string; options: any; color: string; isWinner: boolean;
}> = ({ title, subtitle, code, options, color, isWinner }) => {
    return (
        <div className="flex flex-col overflow-hidden rounded-lg border" style={{ borderColor: isWinner ? `${color}40` : 'rgba(26,58,92,0.4)', boxShadow: isWinner ? `0 0 20px ${color}15` : 'none' }}>
            <div className="flex-none flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(26,58,92,0.4)', background: 'rgba(8,15,26,0.8)' }}>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color }}>{title}</span>
                    {isWinner && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-cyber-bg" style={{ background: color }}>WINNER</span>}
                </div>
                <span className="text-[10px] font-mono text-cyber-text-muted">{subtitle}</span>
            </div>
            <div className="flex-1 overflow-hidden">
                <Editor
                    language="typescript"
                    value={code}
                    options={options}
                    theme="vs-dark"
                />
            </div>
        </div>
    );
};
