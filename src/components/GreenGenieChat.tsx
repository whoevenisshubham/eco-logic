// GreenGenieChat.tsx — AI "Green-Genie" refactor sidebar with 3 refactor options
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { Sparkles, Send, Loader2, Zap, Gauge, Leaf, ChevronRight } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    refactorOptions?: RefactorOption[];
}

interface RefactorOption {
    type: 'eco' | 'performance' | 'balanced';
    label: string;
    saving: string;
    description: string;
    codeSnippet: string;
    icon: React.ReactNode;
    color: string;
}

const ECO_OPTION: RefactorOption = {
    type: 'eco',
    label: 'Eco Mode',
    saving: '−41% Energy',
    description: 'Optimizes for minimum joule consumption. Uses cache-aligned data structures and minimizes allocations.',
    codeSnippet: `// Eco: Inline merge with typed arrays (zero-copy)
function mergeInPlace(arr: Int32Array, tmp: Int32Array, l: number, m: number, r: number): void {
  tmp.set(arr.subarray(l, m + 1));
  let i = 0, j = m + 1, k = l;
  while (i < m - l + 1 && j <= r) {
    if (tmp[i] <= arr[j]) arr[k++] = tmp[i++];
    else arr[k++] = arr[j++];
  }
  while (i < m - l + 1) arr[k++] = tmp[i++];
}`,
    icon: <Leaf size={14} />,
    color: '#00ff88',
};

const PERF_OPTION: RefactorOption = {
    type: 'performance',
    label: 'Performance Mode',
    saving: '−68% Time',
    description: 'Maximizes throughput using SIMD-friendly patterns. Higher energy but 2.3× faster wall-clock time.',
    codeSnippet: `// Perf: Parallel merge using SharedArrayBuffer
function parallelSort(arr: number[]): Promise<number[]> {
  const worker = new Worker('./sortWorker.js');
  const shared = new SharedArrayBuffer(arr.length * 4);
  const view = new Int32Array(shared);
  view.set(arr);
  worker.postMessage({ buffer: shared, start: 0, end: arr.length });
  return new Promise(resolve => worker.onmessage = e => resolve([...e.data]));
}`,
    icon: <Gauge size={14} />,
    color: '#ffd700',
};

const BALANCED_OPTION: RefactorOption = {
    type: 'balanced',
    label: 'Balanced Mode',
    saving: '−28% Energy, −45% Time',
    description: 'TimSort hybrid: run-detection + bitwise calcMinRun. Best real-world tradeoff.',
    codeSnippet: `// Balanced: TimSort with run optimization
function adaptiveSort(arr: number[]): number[] {
  const minRun = (n: number) => {
    let r = 0;
    while (n >= 32) { r |= n & 1; n >>= 1; }
    return n + r; // O(1), branchless
  };
  const runs = detectRuns(arr); // Natural run detection
  return mergeRuns(arr, runs, minRun(arr.length));
}`,
    icon: <Zap size={14} />,
    color: '#00d4ff',
};

const INITIAL_MESSAGES: Message[] = [
    {
        role: 'assistant',
        content: '👋 I\'m **Green-Genie**, your AI energy optimization assistant. I analyze your code\'s energy signature and suggest refactoring strategies. Select a code block and ask me to analyze it!',
    }
];

const RESPONSES: Record<string, Message> = {
    default: {
        role: 'assistant',
        content: `🔍 **Energy Analysis Complete** for \`mergeSort()\`\n\n**Key findings:**\n- 🔴 High DRAM latency (avg 45ns) — cache-unfriendly memory access pattern\n- 🟡 Frequent heap allocations in \`merge()\` — GC pressure\n- 🟣 22% branch misprediction rate in comparison loop\n\n**Root cause:** \`Array.slice()\` creates new heap objects every recursion level, causing DRAM pressure. The comparison \`left[i] <= right[j]\` creates an unpredictable branch pattern.\n\nHere are 3 refactoring strategies:`,
        refactorOptions: [ECO_OPTION, PERF_OPTION, BALANCED_OPTION],
    }
};

export const GreenGenieChat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedOption, setSelectedOption] = useState<RefactorOption | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { isRunning, algorithmA } = useTelemetryStore();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        await new Promise(r => setTimeout(r, 1200));

        const response = RESPONSES.default;
        setIsTyping(false);
        setMessages(prev => [...prev, response]);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header flex-none">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-cyber-yellow" style={{ filter: 'drop-shadow(0 0 6px #ffd700)' }} />
                    <span className="panel-title">Green-Genie AI</span>
                </div>
                <span className="text-[10px] font-mono text-cyber-text-muted">Energy Refactor Assistant</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="flex-none w-6 h-6 rounded-full flex items-center justify-center mt-1" style={{ background: 'rgba(255,215,0,0.2)', border: '1px solid rgba(255,215,0,0.4)' }}>
                                <Sparkles size={10} className="text-cyber-yellow" />
                            </div>
                        )}
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5 ${msg.role === 'user'
                                ? 'bg-cyber-accent/15 border border-cyber-accent/30 text-white text-right'
                                : 'bg-cyber-surface border border-cyber-border/40 text-cyber-text-primary'
                            }`}
                        >
                            <div className="whitespace-pre-wrap font-sans" dangerouslySetInnerHTML={{
                                __html: msg.content
                                    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8f4f8">$1</strong>')
                                    .replace(/`(.*?)`/g, '<code style="color:#00d4ff;background:rgba(0,212,255,0.1);padding:1px 4px;border-radius:3px;font-family:JetBrains Mono">$1</code>')
                                    .replace(/🔴/g, '<span style="color:#ff3366">🔴</span>')
                                    .replace(/🟡/g, '<span style="color:#ffd700">🟡</span>')
                                    .replace(/🟣/g, '<span style="color:#b44fff">🟣</span>')
                            }} />

                            {/* Refactor options */}
                            {msg.refactorOptions && (
                                <div className="mt-3 space-y-2">
                                    {msg.refactorOptions.map((opt) => (
                                        <motion.div
                                            key={opt.type}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => setSelectedOption(prev => prev?.type === opt.type ? null : opt)}
                                            className="cursor-pointer rounded-lg p-2 border transition-all"
                                            style={{
                                                borderColor: selectedOption?.type === opt.type ? `${opt.color}60` : 'rgba(26,58,92,0.5)',
                                                background: selectedOption?.type === opt.type ? `${opt.color}12` : 'rgba(8,15,26,0.6)',
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5" style={{ color: opt.color }}>
                                                    {opt.icon}
                                                    <span className="font-semibold">{opt.label}</span>
                                                </div>
                                                <span className="text-[10px] font-mono" style={{ color: opt.color }}>{opt.saving}</span>
                                            </div>
                                            <p className="text-[10px] text-cyber-text-muted mt-1">{opt.description}</p>
                                            <AnimatePresence>
                                                {selectedOption?.type === opt.type && (
                                                    <motion.pre
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="mt-2 text-[9px] font-mono overflow-x-auto rounded p-2"
                                                        style={{ background: 'rgba(0,0,0,0.4)', color: '#00ff88', maxHeight: '120px', overflowY: 'auto' }}
                                                    >
                                                        {opt.codeSnippet}
                                                    </motion.pre>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                        <div className="flex-none w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,215,0,0.2)', border: '1px solid rgba(255,215,0,0.4)' }}>
                            <Sparkles size={10} className="text-cyber-yellow" />
                        </div>
                        <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyber-surface border border-cyber-border/40">
                            <Loader2 size={12} className="text-cyber-accent animate-spin" />
                            <span className="text-xs text-cyber-text-muted font-mono">Analyzing energy signature...</span>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            <div className="flex-none px-3 pb-2 flex flex-wrap gap-1">
                {['Analyze current code', 'Why is cache hit rate low?', 'SIMD optimization tips'].map(prompt => (
                    <button key={prompt} onClick={() => setInput(prompt)} className="text-[10px] px-2 py-1 rounded-full border border-cyber-border/40 text-cyber-text-muted hover:text-cyber-accent hover:border-cyber-accent/40 transition-colors">
                        {prompt}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="flex-none px-3 pb-3">
                <div className="flex gap-2 p-1 rounded-xl border border-cyber-border/40" style={{ background: 'rgba(8,15,26,0.8)' }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder={isRunning ? "Ask Green-Genie..." : "Run profiler first..."}
                        disabled={!isRunning}
                        className="flex-1 bg-transparent text-xs text-white placeholder-cyber-text-muted px-2 outline-none font-mono"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!isRunning || !input.trim()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 bg-cyber-yellow/20 border border-cyber-yellow/30 text-cyber-yellow hover:bg-cyber-yellow/30"
                    >
                        <Send size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
};
