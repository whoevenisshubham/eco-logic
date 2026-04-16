import React from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const DifferentialProfilingView: React.FC = () => {
    const { isRunning, totalEnergyA, complexityMetrics, baselineEnergy, setBaselineEnergy } = useTelemetryStore();

    function handleSetBaseline() {
        setBaselineEnergy(totalEnergyA);
    }

    // Calculate percentage difference vs baseline
    let percentageDiff: number | null = null;
    let diffColor = 'text-slate-400';
    let diffSign = '';
    
    if (baselineEnergy !== null && baselineEnergy > 0) {
        percentageDiff = ((totalEnergyA - baselineEnergy) / baselineEnergy) * 100;
        
        if (percentageDiff > 0) {
            diffColor = 'text-red-500';
            diffSign = '+';
        } else if (percentageDiff < 0) {
            diffColor = 'text-emerald-500';
        } else {
            diffColor = 'text-slate-400';
        }
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none flex justify-between items-center pr-3">
                <span className="panel-title">History / Baseline Tracker</span>
                {isRunning && (
                    <button 
                        onClick={handleSetBaseline}
                        className="text-[10px] px-2 py-1 rounded bg-blue-500 text-white font-bold hover:bg-blue-500/80 transition-colors"
                    >
                        Set as Baseline
                    </button>
                )}
            </div>
            <div className="flex-1 p-4 overflow-auto">
                {isRunning ? (
                    <div className="space-y-4 font-mono text-sm">
                        <div className="p-4 border border-slate-700/40 rounded-lg bg-slate-900">
                            <h3 className="text-blue-500 font-bold mb-2">Current Run</h3>
                            <p className="text-slate-300">
                                Total Energy: <span className="text-orange-500">{totalEnergyA.toFixed(4)} J</span>
                            </p>
                            <p className="text-slate-300">
                                Overall Complexity: <span className="text-purple-500">{complexityMetrics.overallComplexity}</span>
                            </p>
                        </div>
                        
                        <div className={`p-4 border ${baselineEnergy !== null ? 'border-slate-700/40 bg-slate-900' : 'border-slate-700/20 bg-white/50'} rounded-lg`}>
                            <h3 className={`${baselineEnergy !== null ? 'text-blue-500' : 'text-slate-400'} font-bold mb-2`}>
                                Baseline Run
                            </h3>
                            
                            {baselineEnergy !== null ? (
                                <>
                                    <p className="text-slate-300">
                                        Saved Energy: <span className="text-orange-500">{baselineEnergy.toFixed(4)} J</span>
                                    </p>
                                    <p className="mt-2 text-slate-300">
                                        Difference: <span className={`font-bold ${diffColor}`}>
                                            {diffSign}{percentageDiff !== null ? percentageDiff.toFixed(2) : 0}%
                                        </span>
                                    </p>
                                </>
                            ) : (
                                <p className="text-slate-400">No baseline set. Click "Set as Baseline" above.</p>
                            )}
                        </div>
                        <div className="text-xs text-slate-400 mt-6 leading-relaxed">
                            * Note: The History/Baseline tracker evaluates the current static AST compilation against a saved snapshot to analyze energy consumption improvements (or degradations) across code changes.
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                        Run analysis to view baseline comparisons
                    </div>
                )}
            </div>
        </div>
    );
};

