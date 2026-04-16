import React from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const DifferentialProfilingView: React.FC = () => {
    const { isRunning, totalEnergyA, complexityMetrics, baselineEnergy, setBaselineEnergy } = useTelemetryStore();

    function handleSetBaseline() {
        setBaselineEnergy(totalEnergyA);
    }

    // Calculate percentage difference vs baseline
    let percentageDiff: number | null = null;
    let diffColor = 'text-gray-500';
    let diffSign = '';
    
    if (baselineEnergy !== null && baselineEnergy > 0) {
        percentageDiff = ((totalEnergyA - baselineEnergy) / baselineEnergy) * 100;
        
        if (percentageDiff > 0) {
            diffColor = 'text-red-500';
            diffSign = '+';
        } else if (percentageDiff < 0) {
            diffColor = 'text-emerald-500';
        } else {
            diffColor = 'text-gray-500';
        }
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header drag-handle cursor-grab active:cursor-grabbing border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
                <span className="panel-title font-semibold text-[14px]">History / Baseline Tracker</span>
                {isRunning && (
                    <button 
                        onClick={handleSetBaseline}
                        className="text-[11px] px-2 py-1 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-600/80 transition-colors"
                    >
                        Set as Baseline
                    </button>
                )}
            </div>
            <div className="flex-1 p-4 overflow-auto">
                {isRunning ? (
                    <div className="space-y-4 font-mono text-sm">
                        <div className="p-4 border border-gray-50/40 rounded-lg bg-gray-50">
                            <h3 className="text-indigo-600 font-bold mb-2">Current Run</h3>
                            <p className="text-gray-500">
                                Total Energy: <span className="text-orange-500">{totalEnergyA.toFixed(4)} J</span>
                            </p>
                            <p className="text-gray-500">
                                Overall Complexity: <span className="text-purple-500">{complexityMetrics.overallComplexity}</span>
                            </p>
                        </div>
                        
                        <div className={`p-4 border ${baselineEnergy !== null ? 'border-gray-50/40 bg-gray-50' : 'border-gray-50/20 bg-white/50'} rounded-lg`}>
                            <h3 className={`${baselineEnergy !== null ? 'text-indigo-600' : 'text-gray-500'} font-bold mb-2`}>
                                Baseline Run
                            </h3>
                            
                            {baselineEnergy !== null ? (
                                <>
                                    <p className="text-gray-500">
                                        Saved Energy: <span className="text-orange-500">{baselineEnergy.toFixed(4)} J</span>
                                    </p>
                                    <p className="mt-2 text-gray-500">
                                        Difference: <span className={`font-bold ${diffColor}`}>
                                            {diffSign}{percentageDiff !== null ? percentageDiff.toFixed(2) : 0}%
                                        </span>
                                    </p>
                                </>
                            ) : (
                                <p className="text-gray-500">No baseline set. Click "Set as Baseline" above.</p>
                            )}
                        </div>
                        <div className="text-[13px] text-gray-500 mt-6 leading-relaxed">
                            * Note: The History/Baseline tracker evaluates the current static AST compilation against a saved snapshot to analyze energy consumption improvements (or degradations) across code changes.
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-[13px] text-gray-500 font-mono">
                        Run analysis to view baseline comparisons
                    </div>
                )}
            </div>
        </div>
    );
};

