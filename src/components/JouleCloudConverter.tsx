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
            <div className="panel-header drag-handle cursor-grab active:cursor-grabbing border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
                <span className="panel-title font-semibold text-[14px]">Cloud Scale Impact</span>
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-sm space-y-4">
                {isRunning ? (
                    <>
                        <div className="p-3 border border-gray-50/40 rounded-lg bg-gray-50">
                            <div className="text-gray-500 text-[13px] mb-1">Deployment Scale Assumption</div>
                            <div className="text-indigo-600 font-bold">1,000,000 executions / day</div>
                        </div>
                        <div className="p-3 border border-orange-500/30 rounded-lg bg-orange-500/10">
                            <div className="text-orange-500/80 text-[13px] mb-1">Monthly Cloud Energy Cost</div>
                            <div className="text-orange-500 text-lg font-bold">${monthlyCost.toFixed(2)}</div>
                        </div>
                        <div className="p-3 border border-emerald-500/30 rounded-lg bg-emerald-500/10">
                            <div className="text-emerald-500/80 text-[13px] mb-1">Daily Carbon Footprint</div>
                            <div className="text-emerald-500 text-lg font-bold">{(dailyCarbonGrams / 1000).toFixed(2)} kg CO₂</div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-[13px] text-gray-500 text-center">
                        Run analysis to forecast cloud impact
                    </div>
                )}
            </div>
        </div>
    );
};

