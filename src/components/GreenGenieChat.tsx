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

const ChatMessageContent: React.FC<{ content: string; role: 'user' | 'assistant'; onApplyCode: (code: string) => void }> = ({ content, role, onApplyCode }) => {
    if (role === 'user') {
        return <span className="whitespace-pre-wrap">{content}</span>;
    }

    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const match = part.match(/```(\w*)\n([\s\S]*?)```/);
                    const code = match ? match[2].trim() : part.slice(3, -3).trim();
                    
                    return (
                        <div key={index} className="relative my-3 group bg-slate-800 text-slate-50 p-3 rounded-lg overflow-x-auto font-mono text-[13px] leading-relaxed shadow-sm">
                            <button
                                onClick={() => onApplyCode(code)}
                                title="Apply to Editor"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow-sm font-sans font-medium"
                            >
                                Apply to Editor
                            </button>
                            <pre className="m-0 p-0 block">{code}</pre>
                        </div>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </div>
    );
};

export const GreenGenieChat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([INITIAL_ASSISTANT_MESSAGE]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { sourceCode, setSourceCode, astTree, isRunning, isAnalyzing } = useTelemetryStore();

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
        <div className="h-full flex flex-col overflow-hidden print:hidden">
            <div className="panel-header drag-handle cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2.5">
                    <Sparkles size={16} className="text-amber-500" style={{ filter: 'drop-shadow(0 0 2px rgba(245,158,11,0.4))' }} />
                    <span className="panel-title">Green-Genie AI</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 tracking-wide">Semantic Refactor Assistant</span>
            </div>

            <div className="flex-none px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shadow-[inset_0_-1px_2px_rgba(0,0,0,0.02)]">
                <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">Active Targets:</span>
                <span className="text-[12px] font-mono font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    {topHotspots.length > 0
                        ? `${topHotspots.map((node) => `L${node.line}`).join(', ')}`
                        : 'None. Run analysis first.'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 relative custom-scrollbar">
                {isAnalyzing && (
                    <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-3/4 max-w-md p-6 bg-white border border-indigo-100 shadow-xl rounded-2xl space-y-3">
                            <div className="flex flex-col gap-2">
                                <div className="h-2 rounded-full bg-slate-200 animate-pulse" />
                                <div className="h-2 rounded-full bg-slate-200 animate-pulse w-4/5" />
                                <div className="h-2 rounded-full bg-slate-200 animate-pulse w-3/5" />
                            </div>
                            <p className="text-center textxs font-semibold text-indigo-600 mt-4 tracking-wide">Extracting top AST energy hotspots...</p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col gap-1 w-full mt-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        {message.role === 'user' && <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1 pr-1">You</span>}
                        {message.role === 'assistant' && <span className="text-xs font-semibold text-amber-500 uppercase tracking-widest pl-1 pr-1">Green-Genie</span>}
                        
                        <div
                            className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${message.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md'
                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                                }`}
                        >
                            {message.content ? (
                                <ChatMessageContent 
                                    content={message.content} 
                                    role={message.role} 
                                    onApplyCode={setSourceCode} 
                                />
                            ) : (
                                message.role === 'assistant' ? '...' : ''
                            )}
                        </div>
                    </motion.div>
                ))}

                <AnimatePresence>
                    {isStreaming && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col gap-1 items-start w-full mt-2"
                        >
                            <span className="text-xs font-semibold text-amber-500 uppercase tracking-widest pl-1 pr-1">Green-Genie</span>
                            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-sm">
                                <Loader2 size={14} className="text-indigo-600 animate-spin" />
                                <span className="text-[13px] text-slate-500 font-medium">Streaming optimization guidance...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            <div className="flex-none px-5 pb-3 pt-2 bg-gradient-to-t from-white via-white to-transparent flex flex-wrap gap-2">
                {[
                    'Focus on O(N^2) hotspots',
                    'Reduce memory allocations',
                    'Suggest cache-friendly rewrite',
                ].map((prompt) => (
                    <button
                        key={prompt}
                        onClick={() => setInput(prompt)}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            <div className="flex-none px-5 pb-5 bg-white">
                <div className="flex gap-3 p-1.5 rounded-2xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-indigo-400 focus-within:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] transition-all">
                    <input
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                void sendMessage();
                            }
                        }}
                        placeholder={canSend ? 'Ask Green-Genie to refactor hotspots...' : 'Run analysis first...'}
                        disabled={!canSend || isStreaming}
                        className="flex-1 bg-transparent text-[14px] text-slate-800 placeholder-slate-400 px-3 outline-none"
                    />
                    <button
                        onClick={() => {
                            void sendMessage();
                        }}
                        disabled={!canSend || !input.trim() || isStreaming}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:bg-slate-200 disabled:text-slate-400 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-95"
                    >
                        <Send size={16} className="-ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
