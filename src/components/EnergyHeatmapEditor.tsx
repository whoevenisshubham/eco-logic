import React, { useCallback, useEffect, useRef } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';
import { motion } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { Loader2, Zap } from 'lucide-react';

export const EnergyHeatmapEditor: React.FC = () => {
    const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationsRef = useRef<string[]>([]);

    const {
        selectedLineId,
        energyMap,
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

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <div className="flex items-center gap-3">
                    <span className="panel-title">Energy Heatmap Editor</span>
                    <button
                        type="button"
                        onClick={handleRunProfiling}
                        disabled={isAnalyzing || sourceCode.trim().length === 0}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                        {isAnalyzing ? 'Profiling...' : 'Run Semantic Profiling'}
                    </button>
                    {isRunning && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-1.5 rounded bg-red-500 inline-block" />
                            <span className="text-slate-600">Critical</span>
                            <span className="w-3 h-1.5 rounded bg-orange-500 inline-block" />
                            <span className="text-slate-600">High</span>
                            <span className="w-3 h-1.5 rounded bg-amber-500 inline-block" />
                            <span className="text-slate-600">Medium</span>
                            <span className="w-3 h-1.5 rounded bg-emerald-500 inline-block" />
                            <span className="text-slate-600">Low</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">input.py</span>
                    {selectedLineId && (
                        <motion.span
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-200 text-blue-700 bg-blue-50"
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
                        theme="vs-light"
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
            </div>

            {isRunning && energyMap.size > 0 && (
                <div className="flex-none px-4 py-2 border-t border-slate-200 flex items-center gap-4 text-xs">
                    <span className="text-slate-500">{energyMap.size} lines profiled</span>
                </div>
            )}
        </div>
    );
};
