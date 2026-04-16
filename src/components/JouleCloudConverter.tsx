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
                        <div className="p-3 border border-cyber-border/40 rounded-lg bg-cyber-surface">
                            <div className="text-cyber-text-muted text-xs mb-1">Deployment Scale Assumption</div>
                            <div className="text-cyber-accent font-bold">1,000,000 executions / day</div>
                        </div>
                        <div className="p-3 border border-cyber-orange/30 rounded-lg bg-cyber-orange/10">
                            <div className="text-cyber-orange/80 text-xs mb-1">Monthly Cloud Energy Cost</div>
                            <div className="text-cyber-orange text-lg font-bold">${monthlyCost.toFixed(2)}</div>
                        </div>
                        <div className="p-3 border border-cyber-green/30 rounded-lg bg-cyber-green/10">
                            <div className="text-cyber-green/80 text-xs mb-1">Daily Carbon Footprint</div>
                            <div className="text-cyber-green text-lg font-bold">{(dailyCarbonGrams / 1000).toFixed(2)} kg CO₂</div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-cyber-text-muted text-center">
                        Run analysis to forecast cloud impact
                    </div>
                )}
            </div>
        </div>
    );
};
