import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, PlayCircle } from 'lucide-react';
import { useTelemetryStore } from '../store/useTelemetryStore';

export const CICDSimulationPanel: React.FC = () => {
    const { isRunning, totalEnergyA } = useTelemetryStore();
    
    // Hardcoded threshold for enterprise CI/CD simulation demo
    const energyBudget = 50.0; 
    const status = !isRunning ? 'idle' : (totalEnergyA > energyBudget ? 'failed' : 'passed');

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="panel-header drag-handle cursor-grab active:cursor-grabbing border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
                <span className="panel-title font-semibold text-[14px]">CI/CD Pipeline Gate</span>
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-[13px]">
                <div className="space-y-4">
                    <div className="p-3 border border-gray-50/40 rounded-lg bg-gray-50 flex items-center gap-3">
                        <PlayCircle className="text-indigo-600" size={18} />
                        <div>
                            <div className="text-gray-900-primary font-bold">Standard Build & Test</div>
                            <div className="text-gray-500">Passed smoothly (1.2s)</div>
                        </div>
                    </div>
                    <div className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${
                        status === 'idle' ? 'border-gray-50/40 bg-gray-50' : 
                        status === 'failed' ? 'border-red-500/40 bg-red-500/10' : 
                        'border-emerald-500/40 bg-emerald-500/10'
                    }`}>
                        {status === 'idle' && <AlertTriangle className="text-gray-500" size={18} />}
                        {status === 'passed' && <CheckCircle className="text-emerald-500" size={18} />}
                        {status === 'failed' && <XCircle className="text-red-500" size={18} />}
                        <div>
                            <div className="text-gray-900-primary font-bold">Semantic Energy Budget Check</div>
                            <div className="text-gray-500 mt-1">
                                {status === 'idle' 
                                    ? 'Awaiting profiler execution...' 
                                    : `Budget: ${energyBudget.toFixed(2)} J | Actual: ${totalEnergyA.toFixed(2)} J`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

