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
            let className = 'bg-emerald-50 border-l-4 border-emerald-300';
            if (ratio > 0.85) className = 'bg-rose-50 border-l-4 border-rose-400';
            else if (ratio > 0.6) className = 'bg-orange-50 border-l-4 border-orange-400';
            else if (ratio > 0.35) className = 'bg-amber-50 border-l-4 border-amber-400';

            const maxColumn = editor.getModel()?.getLineMaxColumn(lineId) || 1;

            decorations.push({
                range: new monaco.Range(lineId, 1, lineId, maxColumn),
                options: {
                    isWholeLine: false,
                    className,
                    glyphMarginClassName: ratio > 0.6 ? 'glyph-energy-high' : 'glyph-energy-low',
                    overviewRuler: {
                        color: ratio > 0.6 ? '#f43f5e' : '#10b981',
                        position: monaco.editor.OverviewRulerLane.Right,
                    },
                    minimap: {
                        color: ratio > 0.6 ? '#f43f5e' : '#f59e0b',
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
        <div className="h-full flex flex-col overflow-hidden bg-white">
            <div className="panel-header drag-handle cursor-grab active:cursor-grabbing border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-md px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="panel-title">Energy Heatmap Editor</span>
                    <button
                        type="button"
                        onClick={handleRunProfiling}
                        disabled={isAnalyzing || sourceCode.trim().length === 0}
                        className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="currentColor" />}
                        {isAnalyzing ? 'Profiling...' : 'Run Semantic Profiling'}
                    </button>
                    {isRunning && (
                        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ml-2">
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" /> Critical</div>
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" /> High</div>
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" /> Medium</div>
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> Low</div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[12px] font-mono font-medium text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/60">main.py</span>
                    {selectedLineId && (
                        <motion.span
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border border-indigo-200 text-indigo-700 bg-indigo-50 shadow-sm"
                        >
                            <Zap size={12} fill="currentColor" className="text-indigo-500" />
                            Line {selectedLineId}
                        </motion.span>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden">
                    <Editor
                        theme="vs"
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
                <div className="flex-none px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-xs">
                    <span className="text-slate-500 font-medium">{energyMap.size} lines profiled</span>
                </div>
            )}
        </div>
    );
};
