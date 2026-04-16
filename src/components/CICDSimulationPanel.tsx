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
            <div className="panel-header flex-none">
                <span className="panel-title">CI/CD Pipeline Gate</span>
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-xs">
                <div className="space-y-4">
                    <div className="p-3 border border-cyber-border/40 rounded-lg bg-cyber-surface flex items-center gap-3">
                        <PlayCircle className="text-cyber-blue" size={18} />
                        <div>
                            <div className="text-cyber-text-primary font-bold">Standard Build & Test</div>
                            <div className="text-cyber-text-muted">Passed smoothly (1.2s)</div>
                        </div>
                    </div>
                    <div className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${
                        status === 'idle' ? 'border-cyber-border/40 bg-cyber-surface' : 
                        status === 'failed' ? 'border-cyber-red/40 bg-cyber-red/10' : 
                        'border-cyber-green/40 bg-cyber-green/10'
                    }`}>
                        {status === 'idle' && <AlertTriangle className="text-cyber-text-muted" size={18} />}
                        {status === 'passed' && <CheckCircle className="text-cyber-green" size={18} />}
                        {status === 'failed' && <XCircle className="text-cyber-red" size={18} />}
                        <div>
                            <div className="text-cyber-text-primary font-bold">Semantic Energy Budget Check</div>
                            <div className="text-cyber-text-muted mt-1">
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
