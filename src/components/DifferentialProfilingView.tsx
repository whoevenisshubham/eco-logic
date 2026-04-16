import React from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const DifferentialProfilingView: React.FC = () => {
    const { isRunning, totalEnergyA, complexityMetrics, baselineEnergy, setBaselineEnergy } = useTelemetryStore();

    function handleSetBaseline() {
        setBaselineEnergy(totalEnergyA);
    }

    let percentageDiff: number | null = null;
    let isReduction = false;
    let isDegradation = false;
    
    if (baselineEnergy !== null && baselineEnergy > 0) {
        percentageDiff = ((totalEnergyA - baselineEnergy) / baselineEnergy) * 100;
        isReduction = percentageDiff < 0;
        isDegradation = percentageDiff > 0;
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-white">
            <div className="panel-header drag-handle cursor-grab active:cursor-grabbing px-5 py-3.5 flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-md">
                <span className="panel-title font-semibold text-[13px]">History / Baseline Tracker</span>
                {isRunning && (
                    <button 
                        type="button"
                        onClick={handleSetBaseline}
                        className="text-[11px] px-3 py-1.5 rounded-md bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm active:scale-95 border border-indigo-700"
                    >
                        Set as Baseline
                    </button>
                )}
            </div>
            
            <div className="flex-1 p-5 overflow-auto">
                {isRunning ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full blur-xl"/>
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"/> Current Run
                            </h3>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-[11px] text-slate-500 font-medium mb-1">Total Joules</div>
                                    <div className="text-2xl font-black text-slate-800 font-mono">
                                        {totalEnergyA.toFixed(4)}<span className="text-[14px] text-slate-400 ml-1">J</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[11px] text-slate-500 font-medium mb-1">Peak Complexity</div>
                                    <div className="text-[15px] font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                        {complexityMetrics.overallComplexity}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className={`p-4 rounded-xl border ${baselineEnergy !== null ? 'border-slate-200 bg-white shadow-sm' : 'border-dashed border-slate-200 bg-slate-50/50'} relative overflow-hidden transition-all`}>
                            {baselineEnergy !== null && <div className="absolute top-0 right-0 w-16 h-16 bg-slate-500/10 rounded-bl-full blur-xl"/>}
                            
                            <h3 className={`text-xs font-bold ${baselineEnergy !== null ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                                <div className={`w-1.5 h-1.5 ${baselineEnergy !== null ? 'bg-slate-400' : 'bg-slate-300'} rounded-full`}/> Baseline Reference
                            </h3>
                            
                            {baselineEnergy !== null ? (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[11px] text-slate-500 font-medium mb-1">Saved Target</div>
                                        <div className="text-xl font-bold text-slate-600 font-mono">
                                            {baselineEnergy.toFixed(4)}<span className="text-[13px] text-slate-400 ml-1">J</span>
                                        </div>
                                    </div>
                                    
                                    {percentageDiff !== null && (
                                        <div className="text-right flex flex-col items-end">
                                           <div className="text-[11px] text-slate-500 font-medium mb-1.5">Energy Delta</div>
                                           {isReduction && (
                                               <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[13px] font-bold shadow-sm">
                                                  ⬇ {Math.abs(percentageDiff).toFixed(2)}%
                                               </span>
                                           )}
                                           {isDegradation && (
                                               <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md text-[13px] font-bold shadow-sm">
                                                  ⬆ {Math.abs(percentageDiff).toFixed(2)}%
                                               </span>
                                           )}
                                           {!isReduction && !isDegradation && (
                                               <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md text-[13px] font-bold shadow-sm">
                                                  0.00%
                                               </span>
                                           )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-[13px] text-slate-500 font-medium">No baseline established.</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Run an analysis, then click "Set as Baseline" to track energy regressions.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-[13px] text-slate-400 font-medium">
                        Run analysis to view history & baseline trackers
                    </div>
                )}
            </div>
        </div>
    );
};

