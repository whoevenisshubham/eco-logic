import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useTelemetryStore, type SemanticEnergyFingerprintNode } from '../store/useTelemetryStore';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface HotspotSummary {
    id: string;
    nodeType: string;
    line: number;
    estimatedJoules: number;
    complexity: string;
}

function formatHotspotLine(node: HotspotSummary): string {
    return `${node.nodeType} @ line ${node.line} | ${node.estimatedJoules.toFixed(4)}J | ${node.complexity}`;
}

function buildTopHotspots(astTree: SemanticEnergyFingerprintNode[]): HotspotSummary[] {
    return [...astTree]
        .sort((a, b) => b.estimatedJoules - a.estimatedJoules)
        .slice(0, 3)
        .map((node) => ({
            id: node.id,
            nodeType: node.nodeType,
            line: node.line,
            estimatedJoules: node.estimatedJoules,
            complexity: node.complexity,
        }));
}

function createOptimizationPrompt(sourceCode: string, hotspots: HotspotSummary[]): string {
    const hotspotText = hotspots.length > 0
        ? hotspots.map((node, index) => `${index + 1}. ${formatHotspotLine(node)}`).join('\n')
        : 'No hotspot nodes available yet.';

    return [
        'Analyze this code. The highest energy consumption is happening at these AST nodes:',
        hotspotText,
        '',
        'Provide a concrete, code-level refactoring suggestion to reduce the Joule consumption.',
        '',
        'Source code:',
        sourceCode || '// No source code available.',
    ].join('\n');
}

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const geminiClient = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

async function streamRealLlmResponse(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    if (!geminiClient) {
        throw new Error('Gemini API key is missing. Set VITE_GEMINI_API_KEY in your .env file.');
    }

    const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
            onChunk(text);
        }
    }
}

const INITIAL_ASSISTANT_MESSAGE: Message = {
    id: 'assistant-intro',
    role: 'assistant',
    content: 'Green-Genie ready. Run analysis, then ask for joule-focused refactors and I will target the top AST hotspots.',
};

export const GreenGenieChat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([INITIAL_ASSISTANT_MESSAGE]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { sourceCode, astTree, isRunning, isAnalyzing } = useTelemetryStore();

    const topHotspots = useMemo(() => buildTopHotspots(astTree), [astTree]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    const sendMessage = async (): Promise<void> => {
        const trimmed = input.trim();
        if (!trimmed || isStreaming) {
            return;
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
        };

        setMessages((previous) => [...previous, userMessage]);
        setInput('');

        const assistantId = `assistant-${Date.now()}`;
        setMessages((previous) => [...previous, { id: assistantId, role: 'assistant', content: '' }]);
        setIsStreaming(true);

        const prompt = [
            createOptimizationPrompt(sourceCode, topHotspots),
            '',
            `User request: ${trimmed}`,
        ].join('\n');

        let streamedText = '';
        try {
            await streamRealLlmResponse(prompt, (chunk) => {
                streamedText += chunk;
                setMessages((previous) =>
                    previous.map((message) =>
                        message.id === assistantId
                            ? { ...message, content: streamedText }
                            : message
                    )
                );
            });

            if (!streamedText.trim()) {
                setMessages((previous) =>
                    previous.map((message) =>
                        message.id === assistantId
                            ? {
                                ...message,
                                content: 'No response was returned by Gemini. Please try again with a more specific prompt.',
                            }
                            : message
                    )
                );
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to reach Gemini API.';
            setMessages((previous) =>
                previous.map((message) =>
                    message.id === assistantId
                        ? {
                            ...message,
                            content: `Unable to generate optimization guidance right now.\n\n${errorMessage}`,
                        }
                        : message
                )
            );
        } finally {
            setIsStreaming(false);
        }
    };

    const canSend = isRunning && !isAnalyzing && sourceCode.trim().length > 0;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-cyber-yellow" style={{ filter: 'drop-shadow(0 0 6px #ffd700)' }} />
                    <span className="panel-title">Green-Genie AI</span>
                </div>
                <span className="text-[10px] font-mono text-cyber-text-muted">Semantic Energy Refactor Assistant</span>
            </div>

            <div className="flex-none px-3 py-2 border-b border-cyber-border/30 text-[10px] font-mono text-cyber-text-secondary">
                {topHotspots.length > 0
                    ? `Top hotspots: ${topHotspots.map((node) => `L${node.line}`).join(', ')}`
                    : 'No hotspots yet. Run analysis first.'}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 relative">
                {isAnalyzing && (
                    <div className="absolute inset-0 z-20 bg-cyber-bg/70 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-2/3 max-w-md space-y-2">
                            <div className="h-3 rounded bg-cyber-panel animate-pulse" />
                            <div className="h-3 rounded bg-cyber-panel animate-pulse w-11/12" />
                            <p className="text-center text-xs font-mono text-cyber-accent">Extracting top AST energy hotspots...</p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {message.role === 'assistant' && (
                            <div
                                className="flex-none w-6 h-6 rounded-full flex items-center justify-center mt-1"
                                style={{ background: 'rgba(255,215,0,0.18)', border: '1px solid rgba(255,215,0,0.35)' }}
                            >
                                <Sparkles size={10} className="text-cyber-yellow" />
                            </div>
                        )}

                        <div
                            className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-5 whitespace-pre-wrap ${message.role === 'user'
                                ? 'bg-cyber-accent/15 border border-cyber-accent/30 text-white text-right'
                                : 'bg-cyber-surface border border-cyber-border/40 text-cyber-text-primary'
                                }`}
                        >
                            {message.content || (message.role === 'assistant' ? '...' : '')}
                        </div>
                    </motion.div>
                ))}

                <AnimatePresence>
                    {isStreaming && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-2"
                        >
                            <div
                                className="flex-none w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(255,215,0,0.18)', border: '1px solid rgba(255,215,0,0.35)' }}
                            >
                                <Sparkles size={10} className="text-cyber-yellow" />
                            </div>
                            <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyber-surface border border-cyber-border/40">
                                <Loader2 size={12} className="text-cyber-accent animate-spin" />
                                <span className="text-xs text-cyber-text-muted font-mono">Streaming optimization guidance...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            <div className="flex-none px-3 pb-2 flex flex-wrap gap-1">
                {[
                    'Focus on O(N^2) hotspots',
                    'Reduce memory allocations',
                    'Suggest cache-friendly rewrite',
                ].map((prompt) => (
                    <button
                        key={prompt}
                        onClick={() => setInput(prompt)}
                        className="text-[10px] px-2 py-1 rounded-full border border-cyber-border/40 text-cyber-text-muted hover:text-cyber-accent hover:border-cyber-accent/40 transition-colors"
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            <div className="flex-none px-3 pb-3">
                <div className="flex gap-2 p-1 rounded-xl border border-cyber-border/40" style={{ background: 'rgba(8,15,26,0.82)' }}>
                    <input
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                void sendMessage();
                            }
                        }}
                        placeholder={canSend ? 'Ask Green-Genie for joule-saving refactors...' : 'Run analysis and load source code first...'}
                        disabled={!canSend || isStreaming}
                        className="flex-1 bg-transparent text-xs text-white placeholder-cyber-text-muted px-2 outline-none font-mono"
                    />
                    <button
                        onClick={() => {
                            void sendMessage();
                        }}
                        disabled={!canSend || !input.trim() || isStreaming}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 bg-cyber-yellow/20 border border-cyber-yellow/30 text-cyber-yellow hover:bg-cyber-yellow/30"
                    >
                        <Send size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
};
