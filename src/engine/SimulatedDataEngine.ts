// SimulatedDataEngine.ts — Generates realistic 10,000+ energy profiling data points
export interface TelemetryPoint {
    timestamp: number;
    energy: number; // Joules
    cpuCore: number; // Watts
    dramLatency: number; // ns
    cacheHitRate: number; // 0-1
    gpuTransfer: number; // MB/s
    thermalTemp: number; // °C
    memoryPressure: number; // 0-1
    branchMispredict: number; // rate 0-1
    lineId: number; // maps to code line
    astNodeId: string;
    stackDepth: number;
    functionName: string;
    elapsed: number; // ms since start
}

export interface ASTNode {
    id: string;
    lineStart: number;
    lineEnd: number;
    name: string;
    type: 'function' | 'loop' | 'condition' | 'assignment' | 'call';
    complexity: number; // O(1)=1, O(n)=2, O(n²)=3, O(nlogn)=2.5
}

export interface FlameNode {
    name: string;
    start: number;
    end: number;
    depth: number;
    energy: number;
    color: string;
    children?: FlameNode[];
    functionName: string;
    astNodeId: string;
}

export interface SunburstNode {
    name: string;
    value?: number;
    energy?: number;
    children?: SunburstNode[];
    color?: string;
}

// ─── Code Samples ──────────────────────────────────────────────────────
export const ALGORITHM_CODE: Record<string, string> = {
    mergesort: `def merge_sort(arr):
    """MergeSort Implementation — O(n log n)"""
    if len(arr) <= 1:
        return arr
    
    mid = len(arr) // 2
    left = arr[:mid]    # Memory allocation
    right = arr[mid:]   # Memory allocation
    
    # Recursive calls — stack depth increases
    sorted_left = merge_sort(left)
    sorted_right = merge_sort(right)
    
    return merge(sorted_left, sorted_right)

def merge(left, right):
    result = []
    i = j = 0
    
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:     # Branch prediction critical
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])  # Cache miss likely here
            j += 1
    
    result.extend(left[i:])
    result.extend(right[j:])
    return result

def matrix_multiply(A, B):
    """Matrix multiplication — O(n³) DRAM intensive"""
    n = len(A)
    C = [[0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):              # Cache thrashing
            for k in range(n):          # FMA instructions
                C[i][j] += A[i][k] * B[k][j]  # AVX-512 candidate
    
    return C

def fibonacci_memo(n, memo=None):
    """Fibonacci — exponential branching"""
    if memo is None:
        memo = {}
    
    if n <= 1:
        return n
    if n in memo:
        return memo[n]
    
    result = fibonacci_memo(n-1, memo) + fibonacci_memo(n-2, memo)
    memo[n] = result
    return result`,
    timsort: `MIN_MERGE = 32

def calc_min_run(n):
    r = 0
    while n >= MIN_MERGE:
        r |= n & 1  # Bitwise — extremely efficient
        n >>= 1
    return n + r

def insertion_sort(arr, left, right):
    for i in range(left + 1, right + 1):
        temp = arr[i]  # Register-friendly
        j = i - 1
        while j >= left and arr[j] > temp:
            arr[j + 1] = arr[j]  # Sequential memory — cache optimal
            j -= 1
        arr[j + 1] = temp

def timsort_merge(arr, l, m, r):
    len1 = m - l + 1
    len2 = r - m
    left = arr[l:l + len1]      # Minimal allocation
    right = arr[m + 1:m + 1 + len2]
    
    i = j = 0
    k = l
    while i < len1 and j < len2:
        if left[i] <= right[j]:
            arr[k] = left[i]    # Predictable branch
            i += 1
        else:
            arr[k] = right[j]   # High branch accuracy
            j += 1
        k += 1
    
    while i < len1:
        arr[k] = left[i]
        i += 1
        k += 1
    
    while j < len2:
        arr[k] = right[j]
        j += 1
        k += 1

def timsort(arr):
    """TimSort Implementation — Hybrid O(n log n)"""
    n = len(arr)
    min_run = calc_min_run(n)
    result = arr.copy()
    
    for i in range(0, n, min_run):
        insertion_sort(result, i, min(i + min_run - 1, n - 1))
    
    size = min_run
    while size < n:
        for left in range(0, n, 2 * size):
            mid = min(left + size - 1, n - 1)
            right = min(left + 2 * size - 1, n - 1)
            if mid < right:
                timsort_merge(result, left, mid, right)
        size *= 2
    
    return result`,
};

// ─── AST Nodes ──────────────────────────────────────────────────────────
export const AST_NODES: ASTNode[] = [
    { id: 'ast-001', lineStart: 2, lineEnd: 12, name: 'merge_sort', type: 'function', complexity: 2.5 },
    { id: 'ast-002', lineStart: 3, lineEnd: 3, name: 'base case check', type: 'condition', complexity: 1 },
    { id: 'ast-003', lineStart: 5, lineEnd: 7, name: 'array slicing', type: 'assignment', complexity: 2 },
    { id: 'ast-004', lineStart: 10, lineEnd: 11, name: 'recursive calls', type: 'call', complexity: 2.5 },
    { id: 'ast-005', lineStart: 15, lineEnd: 29, name: 'merge', type: 'function', complexity: 2 },
    { id: 'ast-006', lineStart: 20, lineEnd: 26, name: 'comparison loop', type: 'loop', complexity: 2 },
    { id: 'ast-007', lineStart: 21, lineEnd: 25, name: 'branch comparison', type: 'condition', complexity: 2 },
    { id: 'ast-008', lineStart: 32, lineEnd: 43, name: 'matrix_multiply', type: 'function', complexity: 3 },
    { id: 'ast-009', lineStart: 36, lineEnd: 38, name: 'triple nested loop', type: 'loop', complexity: 3 },
    { id: 'ast-010', lineStart: 46, lineEnd: 52, name: 'fibonacci_memo', type: 'function', complexity: 2 },
];

// ─── Synthetic Telemetry Generator ─────────────────────────────────────
class SimulatedDataEngine {
    private static instance: SimulatedDataEngine;
    private baseEnergy = 0;
    private seed = 42;

    static getInstance(): SimulatedDataEngine {
        if (!SimulatedDataEngine.instance) {
            SimulatedDataEngine.instance = new SimulatedDataEngine();
        }
        return SimulatedDataEngine.instance;
    }

    private pseudoRandom(): number {
        this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
        return (this.seed >>> 0) / 4294967296;
    }

    private gaussian(mean: number, std: number): number {
        const u1 = this.pseudoRandom();
        const u2 = this.pseudoRandom();
        const z0 = Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2);
        return Math.max(0, mean + z0 * std);
    }

    generateTimeSeries(count: number = 2000, algorithm: string = 'mergesort'): TelemetryPoint[] {
        this.seed = algorithm === 'mergesort' ? 42 : 137;
        const points: TelemetryPoint[] = [];

        const phases = [
            { pct: 0.2, energyBase: 1.2, cpuBase: 45, label: 'Initialization' },
            { pct: 0.35, energyBase: 3.8, cpuBase: 85, label: 'Recursive Split' },
            { pct: 0.25, energyBase: 5.2, cpuBase: 95, label: 'Deep Recursion' },
            { pct: 0.15, energyBase: 4.1, cpuBase: 78, label: 'Merging' },
            { pct: 0.05, energyBase: 1.5, cpuBase: 42, label: 'Cleanup' },
        ];

        // TimSort is more energy efficient overall
        const efficiencyFactor = algorithm === 'timsort' ? 0.72 : 1.0;

        let currentTime = 0;
        let phaseIdx = 0;
        let phaseCount = 0;
        const astNodes = AST_NODES;

        for (let i = 0; i < count; i++) {
            const progress = i / count;
            phaseCount++;

            if (phaseIdx < phases.length - 1 && progress > phases.slice(0, phaseIdx + 1).reduce((a, p) => a + p.pct, 0)) {
                phaseIdx++;
                phaseCount = 0;
            }

            const phase = phases[phaseIdx];
            const jitter = this.gaussian(0, 0.3);
            const thermal = 55 + (progress * 25) + this.gaussian(0, 3);
            const memPress = 0.2 + progress * 0.5 + this.gaussian(0, 0.05);
            const nodeIdx = Math.floor((astNodes.length - 1) * (i / count));
            const astNode = astNodes[Math.min(nodeIdx, astNodes.length - 1)];

            // Spike events — realistic bursts
            const spike = (i % 200 < 5) ? 2.5 : 1.0;
            const energy = Math.max(0.1, (phase.energyBase + jitter) * efficiencyFactor * spike);

            currentTime += this.gaussian(0.5, 0.1); // ~1ms average sampling

            points.push({
                timestamp: Date.now() - (count - i) * 1000,
                elapsed: currentTime,
                energy,
                cpuCore: Math.max(10, (phase.cpuBase + this.gaussian(0, 8)) * efficiencyFactor),
                dramLatency: algorithm === 'timsort'
                    ? this.gaussian(12, 3)   // Cache-friendly
                    : this.gaussian(45, 15), // Cache-unfriendly
                cacheHitRate: algorithm === 'timsort'
                    ? Math.min(0.99, 0.88 + this.gaussian(0, 0.04))
                    : Math.min(0.95, 0.62 + this.gaussian(0, 0.08)),
                gpuTransfer: this.gaussian(8, 4) * (1 - efficiencyFactor * 0.3),
                thermalTemp: thermal,
                memoryPressure: Math.min(0.99, Math.max(0, memPress)),
                branchMispredict: algorithm === 'timsort'
                    ? Math.max(0, this.gaussian(0.04, 0.01))
                    : Math.max(0, this.gaussian(0.22, 0.05)),
                lineId: astNode.lineStart + Math.floor(this.pseudoRandom() * (astNode.lineEnd - astNode.lineStart)),
                astNodeId: astNode.id,
                stackDepth: Math.floor(3 + (progress * 12) * (1 - progress * 0.5)),
                functionName: astNode.name,
            });
        }

        return points;
    }

    generateFlameGraph(algorithm: string = 'mergesort'): FlameNode[] {
        const isTimSort = algorithm === 'timsort';
        const totalTime = isTimSort ? 380 : 520;

        return [
            {
                name: isTimSort ? 'timSort' : 'mergeSort', start: 0, end: totalTime, depth: 0,
                energy: isTimSort ? 2.1 : 3.8, color: '#00d4ff',
                functionName: isTimSort ? 'timSort' : 'mergeSort', astNodeId: 'ast-001',
                children: [
                    {
                        name: isTimSort ? 'insertionSort' : 'mergeSort (L)', start: 10, end: isTimSort ? 180 : 260, depth: 1,
                        energy: isTimSort ? 0.8 : 1.9, color: '#00ff88',
                        functionName: isTimSort ? 'insertionSort' : 'mergeSort', astNodeId: 'ast-002',
                        children: [
                            {
                                name: isTimSort ? 'calcMinRun' : 'mergeSort (LL)', start: 15, end: isTimSort ? 60 : 130, depth: 2,
                                energy: isTimSort ? 0.2 : 1.0, color: '#ffd700',
                                functionName: isTimSort ? 'calcMinRun' : 'mergeSort', astNodeId: 'ast-003',
                            },
                            {
                                name: 'comparison loop', start: isTimSort ? 70 : 140, end: isTimSort ? 175 : 255, depth: 2,
                                energy: isTimSort ? 0.6 : 0.9, color: '#ff6b35',
                                functionName: 'comparison loop', astNodeId: 'ast-006',
                            }
                        ]
                    },
                    {
                        name: isTimSort ? 'timsortMerge' : 'mergeSort (R)', start: isTimSort ? 190 : 270, end: isTimSort ? 360 : 510, depth: 1,
                        energy: isTimSort ? 1.3 : 1.9, color: '#b44fff',
                        functionName: 'merge', astNodeId: 'ast-005',
                        children: [
                            {
                                name: 'merge inner', start: isTimSort ? 200 : 280, end: isTimSort ? 355 : 505, depth: 2,
                                energy: isTimSort ? 1.2 : 1.8, color: '#ff3366',
                                functionName: 'merge loop', astNodeId: 'ast-006',
                            }
                        ]
                    }
                ]
            }
        ];
    }

    generateRadarData(algorithm: string): number[] {
        const isTimSort = algorithm === 'timsort';
        return isTimSort
            ? [55, 28, 82, 30, 75]   // [CPUCore, DRAMLatency, CacheHit, GPUTransfer, TimeComplexity]
            : [88, 72, 45, 55, 68];  // MergeSort higher on most axes
    }

    generateSunburst(): SunburstNode {
        return {
            name: 'Program',
            children: [
                {
                    name: 'mergeSort',
                    energy: 3.8,
                    children: [
                        { name: 'mergeSort (recursive)', value: 1.9, energy: 1.9, color: '#00d4ff' },
                        {
                            name: 'merge',
                            energy: 1.5,
                            children: [
                                { name: 'comparison', value: 0.8, energy: 0.8, color: '#ff6b35' },
                                { name: 'concat', value: 0.7, energy: 0.7, color: '#ffd700' },
                            ]
                        },
                        { name: 'slice (alloc)', value: 0.4, energy: 0.4, color: '#b44fff' },
                    ]
                },
                {
                    name: 'matrixMultiply',
                    energy: 6.2,
                    children: [
                        { name: '__fma_avx512', value: 2.8, energy: 2.8, color: '#ff3366' },
                        { name: 'outer loop (i)', value: 1.4, energy: 1.4, color: '#ff6b35' },
                        { name: 'middle loop (j)', value: 1.2, energy: 1.2, color: '#ffd700' },
                        { name: 'inner loop (k)', value: 0.8, energy: 0.8, color: '#00ff88' },
                    ]
                },
                {
                    name: 'fibonacciMemo',
                    energy: 1.1,
                    children: [
                        { name: 'Map.has()', value: 0.3, energy: 0.3, color: '#00d4ff' },
                        { name: 'Map.get()', value: 0.2, energy: 0.2, color: '#4fc3f7' },
                        { name: 'recursive calls', value: 0.6, energy: 0.6, color: '#b44fff' },
                    ]
                }
            ]
        };
    }

    generateScatterData(count: number = 5000): Array<{ x: number; y: number; r: number; energy: number; name: string }> {
        this.seed = 99;
        const functions = ['mergeSort', 'merge', 'matrixMultiply', 'fibonacciMemo', 'insertionSort', 'calcMinRun'];
        return Array.from({ length: count }, (_, i) => {
            const fn = functions[Math.floor(this.pseudoRandom() * functions.length)];
            const complexity = this.pseudoRandom() * 4;
            const energy = 0.5 + complexity * 1.5 + this.gaussian(0, 0.5);
            return {
                x: complexity,
                y: energy,
                r: Math.max(2, energy * 2.5),
                energy,
                name: fn,
            };
        });
    }
}

export const dataEngine = SimulatedDataEngine.getInstance();
