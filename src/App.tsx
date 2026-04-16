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
        <div className="h-screen flex items-center justify-center p-8" style={{ background: '#f8fafc', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
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
    { i: 'timeseries', x: 0, y: 0, w: 8, h: 5 },
    { i: 'radar', x: 8, y: 0, w: 4, h: 5 },
    { i: 'editor', x: 0, y: 5, w: 8, h: 9 },
    { i: 'genie', x: 8, y: 5, w: 4, h: 9 },
  ],
  flame: [
    { i: 'flame', x: 0, y: 0, w: 9, h: 9 },
    { i: 'scatter', x: 9, y: 0, w: 3, h: 9 },
    { i: 'timeseries', x: 0, y: 9, w: 12, h: 5 },
  ],
  differential: [
    { i: 'diff', x: 0, y: 0, w: 12, h: 14 },
  ],
  sunburst: [
    { i: 'sunburst', x: 0, y: 0, w: 5, h: 9 },
    { i: 'scatter', x: 5, y: 0, w: 7, h: 9 },
    { i: 'radar', x: 0, y: 9, w: 5, h: 5 },
    { i: 'timeseries', x: 5, y: 9, w: 7, h: 5 },
  ],
  scatter: [
    { i: 'scatter', x: 0, y: 0, w: 8, h: 9 },
    { i: 'radar', x: 8, y: 0, w: 4, h: 9 },
    { i: 'timeseries', x: 0, y: 9, w: 12, h: 5 },
  ],
  enterprise: [
    { i: 'cicd', x: 0, y: 0, w: 4, h: 14 },
    { i: 'cloud', x: 4, y: 0, w: 4, h: 14 },
    { i: 'genie', x: 8, y: 0, w: 4, h: 14 },
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
        backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />
    <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-40 blur-[100px]"
      style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-40 blur-[120px]"
      style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)', transform: 'translate(-30%,30%)' }} />
  </div>
);

const GlobalAnalyzeOverlay: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="absolute inset-0 z-40 bg-white/70 backdrop-blur-sm flex items-center justify-center"
  >
    <div className="w-[420px] max-w-[82vw] rounded-xl border border-indigo-600/30 bg-gray-50/80 p-5 shadow-cyber">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-semibold text-indigo-600 tracking-wide">Semantic Analysis In Progress</span>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 rounded bg-gray-50 animate-pulse" />
        <div className="h-2.5 rounded bg-gray-50 animate-pulse w-11/12" />
        <div className="h-2.5 rounded bg-gray-50 animate-pulse w-9/12" />
      </div>
      <p className="mt-3 text-[11px] text-gray-500 font-mono">
        Building Semantic Energy Fingerprints from AST + telemetry signals...
      </p>
    </div>
  </motion.div>
);

const ErrorNotification: React.FC<{ error: string }> = ({ error }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    transition={{ duration: 0.3 }}
    className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-energy-critical/50 bg-gray-50/95 p-4 shadow-2xl backdrop-blur-sm"
  >
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-energy-critical flex-shrink-0 mt-1" />
      <div>
        <div className="text-xs font-semibold text-energy-critical mb-1">Analysis Error</div>
        <div className="text-xs text-gray-500 font-mono leading-relaxed">{error}</div>
      </div>
    </div>
  </motion.div>
);

const App: React.FC = () => {
  const { mode, isAnalyzing, analysisError } = useTelemetryStore();
  const layout = LAYOUTS[mode] ?? LAYOUTS.live;

  const [gridWidth, setGridWidth] = React.useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setGridWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute a row height that perfectly scales 14 rows across the available screen real-estate
  // Window Height minus ~220px of total top/bottom paddings and margins, divided by 14
  const rowHeight = Math.max(30, Math.floor((window.innerHeight - 220) / 14));

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col overflow-hidden bg-slate-50 transition-colors duration-500">
        <CyberBackground />
        <NavBar />

        <main className="flex-1 relative overflow-hidden" style={{ background: '#f8fafc' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 overflow-auto p-4 md:p-5 lg:p-6"
            >
              <DashboardGrid
                layout={layout}
                rowHeight={rowHeight}
                width={gridWidth - 32}
                margin={[20, 20]}
                containerPadding={[0, 0]}
                draggableHandle=".drag-handle"
                isDraggable={true}
                isResizable={true}
              >
                {layout.map((item) => (
                  <div key={item.i} className="glass-panel">
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
            {analysisError && <ErrorNotification error={analysisError} />}
          </AnimatePresence>
        </main>

        <div
          className="flex-none h-8 flex items-center px-6 gap-5 text-[11px] font-medium tracking-wide text-slate-500 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm z-10"
        >
          <span className="font-semibold text-slate-700">EcoLogic Research v2.0</span>
          <span className="text-slate-300">|</span>
          <span>Workspace Connected</span>
          <span className="text-slate-300">|</span>
          <span>Node.js Environment</span>
          <div className="flex-1" />
          <span className="text-indigo-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"/> Deep-Link Traceability</span>
          <span className="text-emerald-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Semantic Energy Finder</span>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;

