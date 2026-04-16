import React from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const JouleCloudConverter: React.FC = () => {
    const { isRunning, totalEnergyA } = useTelemetryStore();

    // Environmental Impact Conversions
    const executionsPerDay = 1_000_000;
    const dailyJoules = totalEnergyA * executionsPerDay;
    const dailyKWh = dailyJoules / 3600000;
    const carbonPerKWh = 400; // grams
    const dailyCarbonGrams = dailyKWh * carbonPerKWh;
    const monthlyCost = dailyKWh * 30 * 0.12; // Assuming $0.12 per kWh

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <span className="panel-title">Cloud Scale Impact</span>
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-sm space-y-4">
                {isRunning ? (
                    <>
                        <div className="p-3 border border-slate-700/40 rounded-lg bg-slate-900">
                            <div className="text-slate-400 text-xs mb-1">Deployment Scale Assumption</div>
                            <div className="text-blue-500 font-bold">1,000,000 executions / day</div>
                        </div>
                        <div className="p-3 border border-orange-500/30 rounded-lg bg-orange-500/10">
                            <div className="text-orange-500/80 text-xs mb-1">Monthly Cloud Energy Cost</div>
                            <div className="text-orange-500 text-lg font-bold">${monthlyCost.toFixed(2)}</div>
                        </div>
                        <div className="p-3 border border-emerald-500/30 rounded-lg bg-emerald-500/10">
                            <div className="text-emerald-500/80 text-xs mb-1">Daily Carbon Footprint</div>
                            <div className="text-emerald-500 text-lg font-bold">{(dailyCarbonGrams / 1000).toFixed(2)} kg CO₂</div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center">
                        Run analysis to forecast cloud impact
                    </div>
                )}
            </div>
        </div>
    );
};

