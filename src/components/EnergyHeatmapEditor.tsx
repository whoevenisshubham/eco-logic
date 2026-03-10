// EnergyHeatmapEditor.tsx — Monaco Editor with heatmap overlays and hardware breadcrumbs
import React, { useRef, useEffect, useCallback, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { ALGORITHM_CODE } from '../engine/SimulatedDataEngine';
import { Thermometer, Database, GitBranch, Cpu, Zap, AlertTriangle } from 'lucide-react';

const HARDWARE_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    thermal_throttle: { icon: <Thermometer size={10} />, color: '#ff3366', label: 'Thermal Throttle' },
    memory_pressure: { icon: <Database size={10} />, color: '#b44fff', label: 'Memory Pressure' },
    branch_miss: { icon: <GitBranch size={10} />, color: '#ff6b35', label: 'Branch Mispredict' },
    cache_miss: { icon: <Database size={10} />, color: '#4fc3f7', label: 'Cache Miss' },
    gpu_spike: { icon: <Zap size={10} />, color: '#ffd700', label: 'GPU Spike' },
};

interface HeatmapDecoration {
    lineId: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    energy: number;
}

export const EnergyHeatmapEditor: React.FC = () => {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const { selectedLineId, energyMap, hardwareEvents, algorithmA, isRunning } = useTelemetryStore();
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

    const code = ALGORITHM_CODE[algorithmA] || ALGORITHM_CODE.mergesort;

    // Build heatmap decorations
    const buildDecorations = useCallback(() => {
        if (!editorRef.current || !monacoRef.current || !isRunning) return;
        const monaco = monacoRef.current;
        const editor = editorRef.current;

        const maxEnergy = Math.max(...Array.from(energyMap.values()).map(e => e.energy), 0.001);
        const decorations: any[] = [];

        energyMap.forEach((mapping, lineId) => {
            if (lineId < 1) return;
            const ratio = mapping.energy / maxEnergy;
            let className = '';
            if (ratio > 0.85) className = 'heatmap-line-critical';
            else if (ratio > 0.6) className = 'heatmap-line-high';
            else if (ratio > 0.35) className = 'heatmap-line-medium';
            else className = 'heatmap-line-low';

            decorations.push({
                range: new monaco.Range(lineId, 1, lineId, 1),
                options: {
                    isWholeLine: true,
                    className,
                    glyphMarginClassName: ratio > 0.6 ? 'glyph-energy-high' : 'glyph-energy-low',
                    overviewRulerColor: ratio > 0.6 ? '#ff3366' : '#00ff88',
                    overviewRulerLane: monaco.editor.OverviewRulerLane.Right,
                    minimap: { color: ratio > 0.6 ? '#ff3366' : '#ffd700', position: 1 },
                },
            });
        });

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
    }, [energyMap, isRunning]);

    // Deep-link: scroll to selected line
    useEffect(() => {
        if (selectedLineId && editorRef.current) {
            editorRef.current.revealLineInCenter(selectedLineId);
            editorRef.current.setPosition({ lineNumber: selectedLineId, column: 1 });
        }
    }, [selectedLineId]);

    useEffect(() => {
        buildDecorations();
    }, [buildDecorations]);

    const handleEditorMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Custom dark cyber theme
        monaco.editor.defineTheme('cyberAudit', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '00d4ff', fontStyle: 'bold' },
                { token: 'comment', foreground: '3a6b8a', fontStyle: 'italic' },
                { token: 'string', foreground: '00ff88' },
                { token: 'number', foreground: 'ffd700' },
                { token: 'type', foreground: 'b44fff' },
                { token: 'function', foreground: '4fc3f7' },
                { token: 'variable', foreground: 'e8f4f8' },
            ],
            colors: {
                'editor.background': '#080f1a',
                'editor.foreground': '#e8f4f8',
                'editorLineNumber.foreground': '#3a6b8a',
                'editorLineNumber.activeForeground': '#00d4ff',
                'editor.selectionBackground': '#00d4ff22',
                'editor.lineHighlightBackground': '#0d1928',
                'editorCursor.foreground': '#00d4ff',
                'editorGutter.background': '#080f1a',
                'scrollbarSlider.background': '#1a3a5c80',
            },
        });
        monaco.editor.setTheme('cyberAudit');

        buildDecorations();
    };

    // Group hardware events by line
    const eventsByLine = React.useMemo(() => {
        const map = new Map<number, typeof hardwareEvents>();
        hardwareEvents.forEach(e => {
            const existing = map.get(e.lineId) || [];
            map.set(e.lineId, [...existing, e]);
        });
        return map;
    }, [hardwareEvents]);

    const totalLines = code.split('\n').length;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="panel-header flex-none">
                <div className="flex items-center gap-3">
                    <span className="panel-title">Energy Heatmap Editor</span>
                    {isRunning && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-1.5 rounded bg-energy-critical inline-block" />
                            <span className="text-cyber-text-secondary">Critical</span>
                            <span className="w-3 h-1.5 rounded bg-energy-high inline-block" />
                            <span className="text-cyber-text-secondary">High</span>
                            <span className="w-3 h-1.5 rounded bg-energy-medium inline-block" />
                            <span className="text-cyber-text-secondary">Medium</span>
                            <span className="w-3 h-1.5 rounded bg-energy-low inline-block" />
                            <span className="text-cyber-text-secondary">Low</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-cyber-text-muted">{algorithmA}.ts</span>
                    {selectedLineId && (
                        <motion.span
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="cyber-badge"
                        >
                            <Zap size={10} />
                            Line {selectedLineId}
                        </motion.span>
                    )}
                </div>
            </div>

            {/* Editor + Breadcrumbs */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden">
                    <Editor
                        language="typescript"
                        value={code}
                        onMount={handleEditorMount}
                        options={{
                            readOnly: true,
                            minimap: { enabled: true },
                            fontSize: 13,
                            lineHeight: 22,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontLigatures: true,
                            scrollBeyondLastLine: false,
                            glyphMargin: true,
                            folding: true,
                            lineDecorationsWidth: 4,
                            renderLineHighlight: 'line',
                            cursorStyle: 'line',
                            smoothScrolling: true,
                            padding: { top: 12, bottom: 12 },
                        }}
                    />
                </div>

                {/* Hardware Breadcrumbs Mini-map */}
                {isRunning && (
                    <div className="w-10 flex-none overflow-hidden border-l border-cyber-border/40 flex flex-col"
                        style={{ background: '#060c14' }}
                    >
                        <div className="text-[9px] text-cyber-text-muted text-center py-1 tracking-widest border-b border-cyber-border/30">HW</div>
                        <div className="flex-1 relative overflow-hidden">
                            {Array.from(eventsByLine.entries()).map(([lineId, events]) => {
                                const topPct = ((lineId - 1) / totalLines) * 100;
                                return (
                                    <div
                                        key={lineId}
                                        className="absolute left-0 right-0 flex flex-col items-center gap-0.5 cursor-pointer group"
                                        style={{ top: `${topPct}%`, transform: 'translateY(-50%)' }}
                                        title={events.map(e => e.description).join('\n')}
                                    >
                                        {events.slice(0, 2).map((evt, i) => {
                                            const hw = HARDWARE_ICONS[evt.type];
                                            return hw ? (
                                                <div key={i} style={{ color: hw.color, filter: `drop-shadow(0 0 4px ${hw.color})` }}>
                                                    {hw.icon}
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Info row */}
            {isRunning && energyMap.size > 0 && (
                <div className="flex-none px-4 py-2 border-t border-cyber-border/30 flex items-center gap-4 text-xs">
                    <span className="text-cyber-text-muted">{energyMap.size} lines profiled</span>
                    <span className="text-cyber-red">{hardwareEvents.filter(e => e.type === 'thermal_throttle').length} thermal events</span>
                    <span className="text-cyber-purple">{hardwareEvents.filter(e => e.type === 'branch_miss').length} branch misses</span>
                    <span className="text-cyber-blue">{hardwareEvents.filter(e => e.type === 'cache_miss').length} cache misses</span>
                </div>
            )}
        </div>
    );
};
