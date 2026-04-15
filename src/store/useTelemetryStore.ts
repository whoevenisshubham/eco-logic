import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type Algorithm = 'mergesort' | 'timsort';
export type ProfilerMode = 'live' | 'differential' | 'flame' | 'sunburst' | 'scatter' | 'enterprise';

// Exact frontend mirror of backend JSON contract.
export interface SemanticEnergyFingerprintNode {
    id: string;
    nodeType: string;
    line: number;
    estimatedJoules: number;
    complexity: string;
}

// Exact frontend mirror of backend JSON contract.
export interface SemanticEnergyFingerprintResponse {
    astTree: SemanticEnergyFingerprintNode[];
    totalEnergy: number;
    overallComplexity: string;
}

export interface EnergyData {
    totalEnergy: number;
}

export interface ComplexityMetrics {
    overallComplexity: string;
}

export interface TelemetryPoint {
    timestamp: number;
    elapsed: number;
    energy: number;
    cpuCore: number;
    dramLatency: number;
    cacheHitRate: number;
    lineId: number;
    functionName: string;
}

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
    sourceCode: string;
    astTree: SemanticEnergyFingerprintNode[];
    energyData: EnergyData;
    complexityMetrics: ComplexityMetrics;
    isAnalyzing: boolean;
    analysisError: string | null;

    telemetryA: TelemetryPoint[];
    telemetryB: TelemetryPoint[];
    algorithmA: Algorithm;
    algorithmB: Algorithm;
    activeAlgorithm: Algorithm;
    energyMap: Map<number, EnergyMapping>;
    hardwareEvents: HardwareEvent[];
    mode: ProfilerMode;
    isRunning: boolean;
    isStreaming: boolean;
    selectedLineId: number | null;
    selectedTimeWindow: [number, number] | null;
    hoveredFlameNode: string | null;
    totalEnergyA: number;
    totalEnergyB: number;
    peakPowerA: number;
    peakPowerB: number;
    avgCacheHitA: number;
    avgCacheHitB: number;
    joulesDelta: number;

    setMode: (mode: ProfilerMode) => void;
    setAlgorithm: (algo: Algorithm, slot: 'A' | 'B') => void;
    setSourceCode: (sourceCode: string) => void;
    analyzeCode: (sourceCode: string) => Promise<void>;
    runProfiler: () => void;
    stopProfiler: () => void;
    selectLine: (lineId: number | null) => void;
    setTimeWindow: (window: [number, number] | null) => void;
    setHoveredFlameNode: (nodeId: string | null) => void;
    syncTelemetryToCode: (elapsed: number) => number;
}

function getBackendApiBaseUrl(): string {
    const envUrl = import.meta.env.VITE_PROFILE_API_URL as string | undefined;
    return envUrl ?? 'http://127.0.0.1:8000';
}

function mapFingerprintToLegacyTelemetry(astTree: SemanticEnergyFingerprintNode[]): TelemetryPoint[] {
    const now = Date.now();
    return astTree.map((node, index) => {
        const energy = Number(node.estimatedJoules) || 0;
        const cpuCore = Math.max(1, energy * 8);
        const dramLatency = Math.max(2, 40 - energy);
        const cacheHitRate = Math.max(0.1, Math.min(0.99, 1 - (energy / 20)));

        return {
            timestamp: now + index,
            elapsed: index * 1.5,
            energy,
            cpuCore,
            dramLatency,
            cacheHitRate,
            lineId: node.line,
            functionName: node.nodeType,
        };
    });
}

function buildEnergyMapFromAst(astTree: SemanticEnergyFingerprintNode[]): Map<number, EnergyMapping> {
    const map = new Map<number, EnergyMapping>();

    for (const node of astTree) {
        const existing = map.get(node.line);
        if (!existing) {
            map.set(node.line, {
                lineId: node.line,
                energy: node.estimatedJoules,
                cpuCore: Math.max(1, node.estimatedJoules * 8),
                dramLatency: Math.max(2, 40 - node.estimatedJoules),
                branchMispredict: 0,
                cacheHitRate: Math.max(0.1, Math.min(0.99, 1 - (node.estimatedJoules / 20))),
                hardwareEvents: [],
            });
            continue;
        }

        existing.energy = Math.max(existing.energy, node.estimatedJoules);
        existing.cpuCore = Math.max(existing.cpuCore, node.estimatedJoules * 8);
        existing.dramLatency = Math.min(existing.dramLatency, Math.max(2, 40 - node.estimatedJoules));
    }

    return map;
}

function computeLegacyStats(points: TelemetryPoint[]) {
    if (!points.length) {
        return { total: 0, peak: 0, avgCache: 0 };
    }

    const total = points.reduce((sum, point) => sum + point.energy, 0);
    const peak = Math.max(...points.map((point) => point.cpuCore));
    const avgCache = points.reduce((sum, point) => sum + point.cacheHitRate, 0) / points.length;
    return { total, peak, avgCache };
}

export const useTelemetryStore = create<TelemetryState>()(
    subscribeWithSelector((set, get) => ({
        sourceCode: '',
        astTree: [],
        energyData: { totalEnergy: 0 },
        complexityMetrics: { overallComplexity: 'O(1)' },
        isAnalyzing: false,
        analysisError: null,

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
            if (slot === 'A') {
                set({ algorithmA: algo });
                return;
            }
            set({ algorithmB: algo });
        },

        setSourceCode: (sourceCode) => set({ sourceCode }),

        analyzeCode: async (sourceCode: string) => {
            set({
                isAnalyzing: true,
                analysisError: null,
                sourceCode,
            });

            try {
                const response = await fetch(`${getBackendApiBaseUrl()}/api/profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source_code: sourceCode }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Profile API failed (${response.status}): ${errorText}`);
                }

                const data = (await response.json()) as SemanticEnergyFingerprintResponse;

                const legacyTelemetry = mapFingerprintToLegacyTelemetry(data.astTree);
                const legacyStats = computeLegacyStats(legacyTelemetry);

                set({
                    astTree: data.astTree,
                    energyData: { totalEnergy: data.totalEnergy },
                    complexityMetrics: { overallComplexity: data.overallComplexity },
                    telemetryA: legacyTelemetry,
                    telemetryB: [],
                    energyMap: buildEnergyMapFromAst(data.astTree),
                    hardwareEvents: [],
                    isRunning: true,
                    totalEnergyA: data.totalEnergy,
                    totalEnergyB: 0,
                    peakPowerA: legacyStats.peak,
                    peakPowerB: 0,
                    avgCacheHitA: legacyStats.avgCache,
                    avgCacheHitB: 0,
                    joulesDelta: data.totalEnergy,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown analysis error';
                set({
                    analysisError: message,
                    isRunning: false,
                });
            } finally {
                set({ isAnalyzing: false });
            }
        },

        runProfiler: () => {
            const { sourceCode, analyzeCode } = get();
            void analyzeCode(sourceCode);
        },

        stopProfiler: () => set({ isRunning: false }),

        selectLine: (lineId) => set({ selectedLineId: lineId }),

        setTimeWindow: (window) => set({ selectedTimeWindow: window }),

        setHoveredFlameNode: (nodeId) => set({ hoveredFlameNode: nodeId }),

        syncTelemetryToCode: (elapsed) => {
            const { telemetryA } = get();
            if (!telemetryA.length) {
                return 1;
            }
            const point = telemetryA.find((entry) => entry.elapsed >= elapsed) ?? telemetryA[0];
            return point.lineId;
        },
    }))
);
