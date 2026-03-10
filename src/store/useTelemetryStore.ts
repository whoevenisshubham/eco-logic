// useTelemetryStore.ts — Zustand store for high-frequency telemetry state
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { TelemetryPoint } from '../engine/SimulatedDataEngine';
import { dataEngine } from '../engine/SimulatedDataEngine';

export type Algorithm = 'mergesort' | 'timsort';
export type ProfilerMode = 'live' | 'differential' | 'flame' | 'sunburst' | 'scatter' | 'enterprise';

export interface EnergyMapping {
    lineId: number;
    energy: number;
    cpuCore: number;
    dramLatency: number;
    branchMispredict: number;
    cacheHitRate: number;
    hardwareEvents: HardwareEvent[];
}

export interface HardwareEvent {
    type: 'thermal_throttle' | 'memory_pressure' | 'branch_miss' | 'cache_miss' | 'gpu_spike';
    severity: 'low' | 'medium' | 'high';
    lineId: number;
    description: string;
}

export interface TelemetryState {
    // Core data
    telemetryA: TelemetryPoint[];
    telemetryB: TelemetryPoint[];
    algorithmA: Algorithm;
    algorithmB: Algorithm;
    activeAlgorithm: Algorithm;

    // Line energy mappings for deep-link
    energyMap: Map<number, EnergyMapping>;
    hardwareEvents: HardwareEvent[];

    // UI state
    mode: ProfilerMode;
    isRunning: boolean;
    isStreaming: boolean;
    selectedLineId: number | null;
    selectedTimeWindow: [number, number] | null;
    hoveredFlameNode: string | null;

    // Stats
    totalEnergyA: number;
    totalEnergyB: number;
    peakPowerA: number;
    peakPowerB: number;
    avgCacheHitA: number;
    avgCacheHitB: number;
    joulesDelta: number;

    // Actions
    setMode: (mode: ProfilerMode) => void;
    setAlgorithm: (algo: Algorithm, slot: 'A' | 'B') => void;
    runProfiler: () => void;
    stopProfiler: () => void;
    selectLine: (lineId: number | null) => void;
    setTimeWindow: (window: [number, number] | null) => void;
    setHoveredFlameNode: (nodeId: string | null) => void;
    syncTelemetryToCode: (elapsed: number) => number; // returns lineId
}

function buildEnergyMap(points: TelemetryPoint[]): { map: Map<number, EnergyMapping>; events: HardwareEvent[] } {
    const map = new Map<number, EnergyMapping>();
    const events: HardwareEvent[] = [];

    for (const pt of points) {
        const existing = map.get(pt.lineId);
        if (!existing) {
            map.set(pt.lineId, {
                lineId: pt.lineId,
                energy: pt.energy,
                cpuCore: pt.cpuCore,
                dramLatency: pt.dramLatency,
                branchMispredict: pt.branchMispredict,
                cacheHitRate: pt.cacheHitRate,
                hardwareEvents: [],
            });
        } else {
            existing.energy = Math.max(existing.energy, pt.energy);
            existing.cpuCore = Math.max(existing.cpuCore, pt.cpuCore);
            existing.dramLatency = Math.max(existing.dramLatency, pt.dramLatency);
            existing.branchMispredict = Math.max(existing.branchMispredict, pt.branchMispredict);
        }

        // Hardware events
        if (pt.thermalTemp > 78) {
            events.push({ type: 'thermal_throttle', severity: pt.thermalTemp > 88 ? 'high' : 'medium', lineId: pt.lineId, description: `Thermal throttling at ${pt.thermalTemp.toFixed(1)}°C` });
        }
        if (pt.memoryPressure > 0.75) {
            events.push({ type: 'memory_pressure', severity: pt.memoryPressure > 0.9 ? 'high' : 'medium', lineId: pt.lineId, description: `Memory pressure: ${(pt.memoryPressure * 100).toFixed(0)}%` });
        }
        if (pt.branchMispredict > 0.15) {
            events.push({ type: 'branch_miss', severity: pt.branchMispredict > 0.25 ? 'high' : 'medium', lineId: pt.lineId, description: `Branch mispredict: ${(pt.branchMispredict * 100).toFixed(1)}%` });
        }
        if (pt.cacheHitRate < 0.5) {
            events.push({ type: 'cache_miss', severity: 'high', lineId: pt.lineId, description: `Cache hit rate: ${(pt.cacheHitRate * 100).toFixed(0)}%` });
        }
    }

    // Deduplicate events
    const seen = new Set<string>();
    const deduped = events.filter(e => {
        const key = `${e.type}-${e.lineId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return { map, events: deduped };
}

function computeStats(points: TelemetryPoint[]) {
    if (!points.length) return { total: 0, peak: 0, avgCache: 0 };
    const total = points.reduce((s, p) => s + p.energy, 0);
    const peak = Math.max(...points.map(p => p.cpuCore));
    const avgCache = points.reduce((s, p) => s + p.cacheHitRate, 0) / points.length;
    return { total, peak, avgCache };
}

export const useTelemetryStore = create<TelemetryState>()(
    subscribeWithSelector((set, get) => ({
        telemetryA: [],
        telemetryB: [],
        algorithmA: 'mergesort',
        algorithmB: 'timsort',
        activeAlgorithm: 'mergesort',
        energyMap: new Map(),
        hardwareEvents: [],
        mode: 'live',
        isRunning: false,
        isStreaming: false,
        selectedLineId: null,
        selectedTimeWindow: null,
        hoveredFlameNode: null,
        totalEnergyA: 0,
        totalEnergyB: 0,
        peakPowerA: 0,
        peakPowerB: 0,
        avgCacheHitA: 0,
        avgCacheHitB: 0,
        joulesDelta: 0,

        setMode: (mode) => set({ mode }),

        setAlgorithm: (algo, slot) => {
            if (slot === 'A') set({ algorithmA: algo });
            else set({ algorithmB: algo });
        },

        runProfiler: () => {
            const { algorithmA, algorithmB } = get();
            const dataA = dataEngine.generateTimeSeries(2000, algorithmA);
            const dataB = dataEngine.generateTimeSeries(2000, algorithmB);
            const { map, events } = buildEnergyMap(dataA);
            const statsA = computeStats(dataA);
            const statsB = computeStats(dataB);

            set({
                telemetryA: dataA,
                telemetryB: dataB,
                energyMap: map,
                hardwareEvents: events,
                isRunning: true,
                totalEnergyA: statsA.total,
                totalEnergyB: statsB.total,
                peakPowerA: statsA.peak,
                peakPowerB: statsB.peak,
                avgCacheHitA: statsA.avgCache,
                avgCacheHitB: statsB.avgCache,
                joulesDelta: statsA.total - statsB.total,
            });
        },

        stopProfiler: () => set({ isRunning: false }),

        selectLine: (lineId) => set({ selectedLineId: lineId }),

        setTimeWindow: (window) => set({ selectedTimeWindow: window }),

        setHoveredFlameNode: (nodeId) => set({ hoveredFlameNode: nodeId }),

        syncTelemetryToCode: (elapsed) => {
            const { telemetryA } = get();
            if (!telemetryA.length) return 1;
            const point = telemetryA.find(p => p.elapsed >= elapsed) || telemetryA[0];
            return point.lineId;
        },
    }))
);
