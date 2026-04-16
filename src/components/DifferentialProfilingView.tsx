import React from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const DifferentialProfilingView: React.FC = () => {
    const { isRunning, totalEnergyA, complexityMetrics } = useTelemetryStore();

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Differential Profiling View</span>
            </div>
            <div className="flex-1 p-4 overflow-auto">
                {isRunning ? (
                    <div className="space-y-4 font-mono text-sm">
                        <div className="p-4 border border-cyber-border/40 rounded-lg bg-cyber-surface">
                            <h3 className="text-cyber-accent font-bold mb-2">Current Run Statistics</h3>
                            <p className="text-cyber-text-secondary">
                                Total Energy: <span className="text-cyber-orange">{totalEnergyA.toFixed(4)} J</span>
                            </p>
                            <p className="text-cyber-text-secondary">
                                Overall Complexity: <span className="text-cyber-purple">{complexityMetrics.overallComplexity}</span>
                            </p>
                        </div>
                        <div className="p-4 border border-cyber-border/20 rounded-lg bg-cyber-bg/50 opacity-60">
                            <h3 className="text-cyber-text-muted font-bold mb-2">Secondary Run (Baseline)</h3>
                            <p className="text-cyber-text-muted">Awaiting comparative trace execution...</p>
                        </div>
                        <div className="text-xs text-cyber-text-muted mt-6">
                            * Note: Differential comparison evaluates the live AST metrics against stored baseline snapshots to calculate exact Joule delta improvements.
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-cyber-text-muted font-mono">
                        Run analysis to view differential profile
                    </div>
                )}
            </div>
        </div>
    );
};
