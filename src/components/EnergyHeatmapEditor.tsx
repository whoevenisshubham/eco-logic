import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';
import { motion } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { Database, GitBranch, Loader2, Thermometer, Zap } from 'lucide-react';

// Configure Monaco to use local public files or CDN fallback
if (typeof window !== 'undefined' && !window.MonacoEnvironment) {
  window.MonacoEnvironment = {
    getWorkerUrl: (_moduleId: string, label: string) => {
      const baseUrl = import.meta.env.DEV ? '/eco-logic/monaco-editor/vs' : '/eco-logic/monaco-editor/vs';
      if (label === 'json') return `${baseUrl}/language/json/json.worker.js`;
      if (label === 'css' || label === 'scss' || label === 'less') return `${baseUrl}/language/css/css.worker.js`;
      if (label === 'html' || label === 'handlebars' || label === 'razor') return `${baseUrl}/language/html/html.worker.js`;
      if (label === 'typescript' || label === 'javascript') return `${baseUrl}/language/typescript/ts.worker.js`;
      return `${baseUrl}/editor/editor.worker.js`;
    }
  };
}

const HARDWARE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
    thermal_throttle: { icon: <Thermometer size={10} />, color: '#ff3366' },
    memory_pressure: { icon: <Database size={10} />, color: '#b44fff' },
    branch_miss: { icon: <GitBranch size={10} />, color: '#ff6b35' },
    cache_miss: { icon: <Database size={10} />, color: '#4fc3f7' },
    gpu_spike: { icon: <Zap size={10} />, color: '#ffd700' },
};

export const EnergyHeatmapEditor: React.FC = () => {
    const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationsRef = useRef<string[]>([]);

    const {
        selectedLineId,
        energyMap,
        hardwareEvents,
        isRunning,
        isAnalyzing,
        sourceCode,
        setSourceCode,
        analyzeCode,
    } = useTelemetryStore();

    const clearDecorations = useCallback(() => {
        if (!editorRef.current) {
            return;
        }
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }, []);

    const buildDecorations = useCallback(() => {
        if (!editorRef.current || !monacoRef.current || !isRunning) {
            return;
        }

        const monaco = monacoRef.current;
        const editor = editorRef.current;

        const maxEnergy = Math.max(...Array.from(energyMap.values()).map((entry) => entry.energy), 0.001);
        const decorations: MonacoEditor.editor.IModelDeltaDecoration[] = [];

        energyMap.forEach((mapping, lineId) => {
            if (lineId < 1) {
                return;
            }

            const ratio = mapping.energy / maxEnergy;
            let className = 'heatmap-line-low';
            if (ratio > 0.85) className = 'heatmap-line-critical';
            else if (ratio > 0.6) className = 'heatmap-line-high';
            else if (ratio > 0.35) className = 'heatmap-line-medium';

            decorations.push({
                range: new monaco.Range(lineId, 1, lineId, 1),
                options: {
                    isWholeLine: true,
                    className,
                    glyphMarginClassName: ratio > 0.6 ? 'glyph-energy-high' : 'glyph-energy-low',
                    overviewRuler: {
                        color: ratio > 0.6 ? '#ff3366' : '#00ff88',
                        position: monaco.editor.OverviewRulerLane.Right,
                    },
                    minimap: {
                        color: ratio > 0.6 ? '#ff3366' : '#ffd700',
                        position: monaco.editor.MinimapPosition.Inline,
                    },
                },
            });
        });

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
    }, [energyMap, isRunning]);

    useEffect(() => {
        if (selectedLineId && editorRef.current) {
            editorRef.current.revealLineInCenter(selectedLineId);
            editorRef.current.setPosition({ lineNumber: selectedLineId, column: 1 });
        }
    }, [selectedLineId]);

    useEffect(() => {
        buildDecorations();
    }, [buildDecorations]);

    const handleEditorMount = useCallback((editor: MonacoEditor.editor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        buildDecorations();
    }, [buildDecorations]);

    const handleEditorChange = useCallback((value: string | undefined) => {
        setSourceCode(value ?? '');
        clearDecorations();
    }, [clearDecorations, setSourceCode]);

    const handleRunProfiling = useCallback(() => {
        void analyzeCode(sourceCode);
    }, [analyzeCode, sourceCode]);

    const eventsByLine = useMemo(() => {
        const map = new Map<number, typeof hardwareEvents>();
        hardwareEvents.forEach((event) => {
            const existing = map.get(event.lineId) ?? [];
            map.set(event.lineId, [...existing, event]);
        });
        return map;
    }, [hardwareEvents]);

    const totalLines = Math.max(1, sourceCode.split('\n').length);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <div className="flex items-center gap-3">
                    <span className="panel-title">Energy Heatmap Editor</span>
                    <button
                        type="button"
                        onClick={handleRunProfiling}
                        disabled={isAnalyzing || sourceCode.trim().length === 0}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-wide text-cyber-bg bg-cyber-accent hover:bg-cyber-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_16px_rgba(0,255,136,0.35)]"
                    >
                        {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                        {isAnalyzing ? 'Profiling...' : 'Run Semantic Profiling'}
                    </button>
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
                    <span className="text-[10px] font-mono text-cyber-text-muted">input.py</span>
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

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden">
                    <Editor
                        theme="vs-dark"
                        language="python"
                        value={sourceCode}
                        onChange={handleEditorChange}
                        onMount={handleEditorMount}
                        options={{
                            readOnly: false,
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

                {isRunning && (
                    <div
                        className="w-10 flex-none overflow-hidden border-l border-cyber-border/40 flex flex-col"
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
                                        title={events.map((event) => event.description).join('\n')}
                                    >
                                        {events.slice(0, 2).map((event, index) => {
                                            const visual = HARDWARE_ICONS[event.type];
                                            return visual ? (
                                                <div key={`${event.type}-${index}`} style={{ color: visual.color, filter: `drop-shadow(0 0 4px ${visual.color})` }}>
                                                    {visual.icon}
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

            {isRunning && energyMap.size > 0 && (
                <div className="flex-none px-4 py-2 border-t border-cyber-border/30 flex items-center gap-4 text-xs">
                    <span className="text-cyber-text-muted">{energyMap.size} lines profiled</span>
                    <span className="text-cyber-red">{hardwareEvents.filter((event) => event.type === 'thermal_throttle').length} thermal events</span>
                    <span className="text-cyber-purple">{hardwareEvents.filter((event) => event.type === 'branch_miss').length} branch misses</span>
                    <span className="text-cyber-blue">{hardwareEvents.filter((event) => event.type === 'cache_miss').length} cache misses</span>
                </div>
            )}
        </div>
    );
};
