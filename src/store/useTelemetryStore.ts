import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

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
    nodeIndex: number;
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
    energyMap: Map<number, EnergyMapping>;
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
    baselineEnergy: number | null;

    setMode: (mode: ProfilerMode) => void;
    setSourceCode: (sourceCode: string) => void;
    analyzeCode: (sourceCode: string) => Promise<void>;
    runProfiler: () => void;
    stopProfiler: () => void;
    selectLine: (lineId: number | null) => void;
    setTimeWindow: (window: [number, number] | null) => void;
    setHoveredFlameNode: (nodeId: string | null) => void;
    syncTelemetryToCode: (elapsed: number) => number;
    setBaselineEnergy: (energy: number | null) => void;
}

function getBackendApiBaseUrl(): string {
    const envUrl = import.meta.env.VITE_PROFILE_API_URL as string | undefined;
    return envUrl ?? 'http://127.0.0.1:8000';
}

function mapFingerprintToLegacyTelemetry(astTree: SemanticEnergyFingerprintNode[]): TelemetryPoint[] {
    return astTree.map((node, index) => {
        const energy = Number(node.estimatedJoules) || 0;
        const cpuCore = Math.max(1, energy * 8);
        const dramLatency = Math.max(2, 40 - energy);
        const cacheHitRate = Math.max(0.1, Math.min(0.99, 1 - (energy / 20)));

        return {
            nodeIndex: index,
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

const DEFAULT_SOURCE_CODE = `def fibonacci(n):
    """Compute nth Fibonacci number - demonstrates exponential complexity."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

def linear_search(arr, target):
    """Linear search - O(n) complexity."""
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1

def bubble_sort(arr):
    """Bubble sort - O(n²) complexity."""
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`;

export const useTelemetryStore = create<TelemetryState>()(
    subscribeWithSelector((set, get) => ({
        sourceCode: DEFAULT_SOURCE_CODE,
        astTree: [],
        energyData: { totalEnergy: 0 },
        complexityMetrics: { overallComplexity: 'O(1)' },
        isAnalyzing: false,
        analysisError: null,

        telemetryA: [],
        telemetryB: [],
        energyMap: new Map(),
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
        baselineEnergy: null,

        setMode: (mode) => set({ mode }),

        setSourceCode: (sourceCode) => set({ sourceCode }),

        setBaselineEnergy: (energy) => set({ baselineEnergy: energy }),

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

        syncTelemetryToCode: (nodeIndex) => {
            const { telemetryA } = get();
            if (!telemetryA.length) {
                return 1;
            }
            const point = telemetryA.find((entry) => entry.nodeIndex >= nodeIndex) ?? telemetryA[0];
            return point.lineId;
        },
    }))
);
