// JouleCloudConverter.tsx — Real-time AWS/Azure cost calculator
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { Cloud, DollarSign, Zap, TrendingDown, Globe } from 'lucide-react';

interface CloudRegion {
    region: string;
    provider: 'AWS' | 'Azure' | 'GCP';
    kwh_price: number; // USD per kWh
    flag: string;
    color: string;
}

const REGIONS: CloudRegion[] = [
    { region: 'us-east-1 (N. Virginia)', provider: 'AWS', kwh_price: 0.0842, flag: '🇺🇸', color: '#ff6b35' },
    { region: 'eu-west-1 (Ireland)', provider: 'AWS', kwh_price: 0.1612, flag: '🇮🇪', color: '#4fc3f7' },
    { region: 'ap-south-1 (Mumbai)', provider: 'AWS', kwh_price: 0.0897, flag: '🇮🇳', color: '#00ff88' },
    { region: 'eastus (Azure)', provider: 'Azure', kwh_price: 0.0975, flag: '🇺🇸', color: '#00d4ff' },
    { region: 'northeurope (Azure)', provider: 'Azure', kwh_price: 0.1823, flag: '🇪🇺', color: '#b44fff' },
    { region: 'us-central1 (GCP)', provider: 'GCP', kwh_price: 0.0906, flag: '🇺🇸', color: '#ffd700' },
];

// Typical server PUE (Power Usage Effectiveness)
const PUE = 1.15;
// Requests per second on production server
const REQS_PER_SECOND = 1000;
const SECONDS_PER_MONTH = 2592000;

export const JouleCloudConverter: React.FC = () => {
    const { totalEnergyA, totalEnergyB, joulesDelta, isRunning } = useTelemetryStore();

    const calculations = useMemo(() => {
        if (!isRunning || totalEnergyA <= 0) return null;

        // Energy per request (Joules → kWh for 1M requests)
        const energyPerReqJ = totalEnergyA;
        const savedPerReqJ = Math.max(0, joulesDelta);
        const millionReqs = 1_000_000;

        const joules_1M = energyPerReqJ * millionReqs;
        const saved_1M = savedPerReqJ * millionReqs;
        const kwh_1M = joules_1M / 3_600_000 * PUE;
        const kwh_saved_1M = saved_1M / 3_600_000 * PUE;

        // Monthly on production (continuous)
        const monthlyJoules = energyPerReqJ * REQS_PER_SECOND * SECONDS_PER_MONTH;
        const monthlyKwh = monthlyJoules / 3_600_000 * PUE;
        const savedMonthlyKwh = Math.max(0, joulesDelta) * REQS_PER_SECOND * SECONDS_PER_MONTH / 3_600_000 * PUE;

        return REGIONS.map(r => ({
            ...r,
            cost_1M: kwh_1M * r.kwh_price,
            saved_1M: kwh_saved_1M * r.kwh_price,
            monthly_cost: monthlyKwh * r.kwh_price,
            monthly_saved: savedMonthlyKwh * r.kwh_price,
            kwh_1M,
            kwh_saved_1M,
        }));
    }, [totalEnergyA, totalEnergyB, joulesDelta, isRunning]);

    const bestSavings = calculations ? Math.max(...calculations.map(c => c.monthly_saved)) : 0;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <div className="flex items-center gap-2">
                    <Cloud size={14} className="text-cyber-blue" />
                    <span className="panel-title">Joule → Cloud Cost</span>
                </div>
                <span className="text-[10px] font-mono text-cyber-text-muted">Real-time AWS/Azure/GCP</span>
            </div>

            {!isRunning || !calculations ? (
                <div className="flex-1 flex items-center justify-center text-cyber-text-muted text-xs font-mono">Run profiler to calculate cloud savings</div>
            ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {/* Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg border text-center"
                        style={{ background: 'rgba(0,255,136,0.05)', borderColor: 'rgba(0,255,136,0.25)' }}
                    >
                        <div className="flex items-center justify-center gap-1 text-[10px] text-cyber-text-muted mb-1">
                            <Globe size={10} />
                            <span>Max monthly savings on production @ {REQS_PER_SECOND.toLocaleString()} req/s</span>
                        </div>
                        <div className="text-xl font-bold text-cyber-green font-mono">
                            ${bestSavings.toFixed(2)}<span className="text-sm text-cyber-text-muted">/month</span>
                        </div>
                        <div className="text-[10px] text-cyber-text-muted mt-1">
                            Using {Math.abs(joulesDelta).toFixed(3)}J savings × PUE {PUE}
                        </div>
                    </motion.div>

                    {/* Region table */}
                    <div className="space-y-1.5">
                        {calculations.map((calc, i) => (
                            <motion.div
                                key={calc.region}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-2.5 rounded-lg border"
                                style={{ borderColor: `${calc.color}30`, background: 'rgba(8,15,26,0.7)' }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span>{calc.flag}</span>
                                        <span className="text-[10px] font-semibold" style={{ color: calc.color }}>{calc.region}</span>
                                        <span className="text-[9px] px-1 rounded" style={{ background: `${calc.color}22`, color: calc.color }}>{calc.provider}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-cyber-text-muted">${calc.kwh_price}/kWh</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <MiniStat label="Per 1M req" value={`$${calc.cost_1M.toFixed(4)}`} sub={`${calc.kwh_1M.toFixed(3)} kWh`} color={calc.color} />
                                    <MiniStat label="Monthly" value={`$${calc.monthly_cost.toFixed(2)}`} sub="continuous 24/7" color={calc.color} />
                                    <MiniStat label="💚 Savings" value={`$${calc.monthly_saved.toFixed(2)}`} sub="per month" color="#00ff88" highlight />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="text-[9px] text-cyber-text-muted text-center">
                        PUE={PUE} · {REQS_PER_SECOND.toLocaleString()} req/s · Energy δ = {Math.abs(joulesDelta).toFixed(4)}J/req
                    </div>
                </div>
            )}
        </div>
    );
};

const MiniStat: React.FC<{ label: string; value: string; sub: string; color: string; highlight?: boolean }> = ({ label, value, sub, color, highlight }) => (
    <div className={`p-1.5 rounded ${highlight ? 'bg-cyber-green/10 border border-cyber-green/20' : 'bg-cyber-bg/50'}`}>
        <div className="text-[9px] text-cyber-text-muted">{label}</div>
        <div className="text-xs font-mono font-bold" style={{ color }}>{value}</div>
        <div className="text-[9px] text-cyber-text-muted opacity-60">{sub}</div>
    </div>
);
