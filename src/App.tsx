import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { NavBar } from './components/NavBar';
import { EnergyHeatmapEditor } from './components/EnergyHeatmapEditor';
import { TimeSeriesEnergyChart } from './components/TimeSeriesEnergyChart';
import { EnergyFlameGraph } from './components/EnergyFlameGraph';
import { EnergyComplexityRadar } from './components/EnergyComplexityRadar';
import { SunburstProfiler } from './components/SunburstProfiler';
import { DifferentialProfilingView } from './components/DifferentialProfilingView';
import { GreenGenieChat } from './components/GreenGenieChat';
import { CICDSimulationPanel } from './components/CICDSimulationPanel';
import { JouleCloudConverter } from './components/JouleCloudConverter';
import { ComplexityScatterPlot } from './components/ComplexityScatterPlot';
import { useTelemetryStore } from './store/useTelemetryStore';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

interface DashboardLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DashboardGridProps {
  layout: DashboardLayoutItem[];
  rowHeight: number;
  width: number;
  margin: [number, number];
  containerPadding: [number, number];
  draggableHandle: string;
  isDraggable: boolean;
  isResizable: boolean;
  children?: React.ReactNode;
}

const DashboardGrid = GridLayout as unknown as React.ComponentType<DashboardGridProps>;

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="h-screen flex items-center justify-center p-8" style={{ background: '#020408', color: '#ff3366', fontFamily: 'JetBrains Mono, monospace' }}>
          <div>
            <div className="text-lg font-bold mb-2">Runtime Error</div>
            <pre className="text-xs opacity-80 max-w-2xl overflow-auto">{this.state.error.message}</pre>
            <pre className="text-xs opacity-50 mt-2 max-w-2xl overflow-auto">{this.state.error.stack}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const LAYOUTS: Record<string, DashboardLayoutItem[]> = {
  live: [
    { i: 'timeseries', x: 0, y: 0, w: 8, h: 10 },
    { i: 'radar', x: 8, y: 0, w: 4, h: 10 },
    { i: 'editor', x: 0, y: 10, w: 8, h: 13 },
    { i: 'genie', x: 8, y: 10, w: 4, h: 13 },
  ],
  flame: [
    { i: 'flame', x: 0, y: 0, w: 9, h: 14 },
    { i: 'scatter', x: 9, y: 0, w: 3, h: 14 },
    { i: 'timeseries', x: 0, y: 14, w: 12, h: 9 },
  ],
  differential: [
    { i: 'diff', x: 0, y: 0, w: 12, h: 23 },
  ],
  sunburst: [
    { i: 'sunburst', x: 0, y: 0, w: 5, h: 14 },
    { i: 'scatter', x: 5, y: 0, w: 7, h: 14 },
    { i: 'radar', x: 0, y: 14, w: 5, h: 9 },
    { i: 'timeseries', x: 5, y: 14, w: 7, h: 9 },
  ],
  scatter: [
    { i: 'scatter', x: 0, y: 0, w: 8, h: 16 },
    { i: 'radar', x: 8, y: 0, w: 4, h: 16 },
    { i: 'timeseries', x: 0, y: 16, w: 12, h: 7 },
  ],
  enterprise: [
    { i: 'cicd', x: 0, y: 0, w: 4, h: 23 },
    { i: 'cloud', x: 4, y: 0, w: 4, h: 23 },
    { i: 'genie', x: 8, y: 0, w: 4, h: 23 },
  ],
};

const PANEL_MAP: Record<string, React.ReactNode> = {
  timeseries: <TimeSeriesEnergyChart />,
  radar: <EnergyComplexityRadar />,
  editor: <EnergyHeatmapEditor />,
  genie: <GreenGenieChat />,
  flame: <EnergyFlameGraph />,
  scatter: <ComplexityScatterPlot />,
  diff: <DifferentialProfilingView />,
  sunburst: <SunburstProfiler />,
  cicd: <CICDSimulationPanel />,
  cloud: <JouleCloudConverter />,
};

const CyberBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />
    <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20"
      style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
    <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15"
      style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 70%)', transform: 'translate(50%,50%)' }} />
    <motion.div
      className="absolute left-0 right-0 h-px"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent)' }}
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

const GlobalAnalyzeOverlay: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="absolute inset-0 z-40 bg-cyber-bg/70 backdrop-blur-sm flex items-center justify-center"
  >
    <div className="w-[420px] max-w-[82vw] rounded-xl border border-cyber-accent/30 bg-cyber-surface/80 p-5 shadow-cyber">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-cyber-green animate-pulse" />
        <span className="text-sm font-semibold text-cyber-accent tracking-wide">Semantic Analysis In Progress</span>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 rounded bg-cyber-panel animate-pulse" />
        <div className="h-2.5 rounded bg-cyber-panel animate-pulse w-11/12" />
        <div className="h-2.5 rounded bg-cyber-panel animate-pulse w-9/12" />
      </div>
      <p className="mt-3 text-[11px] text-cyber-text-secondary font-mono">
        Building Semantic Energy Fingerprints from AST + telemetry signals...
      </p>
    </div>
  </motion.div>
);

const App: React.FC = () => {
  const { mode, isAnalyzing } = useTelemetryStore();
  const layout = LAYOUTS[mode] ?? LAYOUTS.live;

  const [gridWidth, setGridWidth] = React.useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setGridWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rowHeight = Math.max(28, Math.floor((window.innerHeight - 56 - 32) / 23));

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#020408' }}>
        <CyberBackground />
        <NavBar />

        <main className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 overflow-auto p-2"
            >
              <DashboardGrid
                layout={layout}
                rowHeight={rowHeight}
                width={gridWidth - 16}
                margin={[8, 8]}
                containerPadding={[0, 0]}
                draggableHandle=".drag-handle"
                isDraggable={true}
                isResizable={true}
              >
                {layout.map((item) => (
                  <div key={item.i} className="glass-panel overflow-hidden drag-handle">
                    <ErrorBoundary>
                      {PANEL_MAP[item.i] ?? (
                        <div className="h-full flex items-center justify-center text-xs font-mono" style={{ color: '#3a6b8a' }}>
                          {item.i}
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                ))}
              </DashboardGrid>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {isAnalyzing && <GlobalAnalyzeOverlay />}
          </AnimatePresence>
        </main>

        <div
          className="flex-none h-6 flex items-center px-4 gap-4 text-[10px] font-mono border-t border-cyber-border/30"
          style={{ background: 'rgba(4,8,12,0.95)' }}
        >
          <span style={{ color: '#3a6b8a' }}>EcoLogic Research v2.0</span>
          <span style={{ color: '#1a3a5c' }}>|</span>
          <span style={{ color: '#3a6b8a' }}>Live · Differential · Flame · Sunburst · Scatter · Enterprise</span>
          <span style={{ color: '#1a3a5c' }}>|</span>
          <span style={{ color: '#3a6b8a' }}>Intel i9-14900K · 64GB DDR5</span>
          <div className="flex-1" />
          <span style={{ color: 'rgba(0,212,255,0.5)' }}>Deep-Link Traceability</span>
          <span style={{ color: '#1a3a5c' }}>•</span>
          <span style={{ color: 'rgba(0,255,136,0.5)' }}>Semantic Energy Fingerprints</span>
          <span style={{ color: '#1a3a5c' }}>•</span>
          <span style={{ color: 'rgba(180,79,255,0.5)' }}>Differential Profiling</span>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
