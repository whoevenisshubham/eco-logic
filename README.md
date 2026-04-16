# Eco-Logic: Algorithm-Level Power Profiling for Energy-Efficient Software Systems

![Eco-Logic Preview](https://github.com/whoevenisshubham/eco-logic/assets/demo-placeholder.png) <!-- Note: Replace with actual screenshot path if available later -->

**Eco-Logic** is a high-performance, research-grade software energy profiler dashboard built to make energy consumption a first-class debugging citizen. It features a complete architecture for ingesting high-frequency telemetry data, deep-linking performance spikes back to origin code, and visualising multi-dimensional metrics at scale.

![Status: Deployed](https://img.shields.io/badge/Status-Deployed-success?style=for-the-badge)
![Tech: React 18](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)
![Tech: Vite](https://img.shields.io/badge/Vite-7.3-646CFF?style=for-the-badge&logo=vite)
![Tech: D3.js](https://img.shields.io/badge/D3.js-7.9-F9A03C?style=for-the-badge&logo=d3.js)

## 🚀 Live Demo

**Check out the live deployment here:**  
👉 **[https://whoevenisshubham.github.io/eco-logic/](https://whoevenisshubham.github.io/eco-logic/)**

## ✨ Core Features

* **High-Frequency Telemetry Engine**: Simulated ingestion of high-resolution processing data capable of plotting 10,000+ data nodes without UI lag, thanks to Zustand state separation and `ResizeObserver` responsive layouts.
* **Custom D3.js Visualisations**:
  * **Energy Flame Graph:** Top-down stack depth vs runtime tracing with dynamic height scaling. 
  * **5-Axis Complexity Radar:** Multi-metric algorithmic comparison (CPU, DRAM, Cache, GPU, Time Complexity).
  * **Sunburst Profiler:** Hierarchical, interactive ring charts with deep breadcrumb trailing.
  * **Time-Series Monitoring:** Sub-millisecond continuous performance plotting.
  * **Algorithmic Scatter Plots:** Visual correlation of large datasets.
* **Code Traceability (Deep Linking)**: Integrated **Monaco Editor** that immediately traces visualization spikes back to exact code lines for rapid optimization.
* **Differential Profiling**: A/B test sorting algorithms (MergeSort vs TimSort) side-by-side with localized metrics.
* **Enterprise Analysis**: 
  * Hardware simulations (ARMv8 vs x86) via CICD pipelines.
  * Cloud impact converter translating Joules to Carbon footprints.
* **Fully Responsive Grid Layout**: Powered by `react-grid-layout`, allowing highly customized, draggable, and dynamic window pane management.

## 🛠️ Tech Stack

* **Framework:** React 18 (with Vite 7)
* **Language:** TypeScript
* **State Management:** Zustand
* **Visualizations:** D3.js (v7), Recharts
* **Animations:** Framer Motion
* **Styling:** Tailwind CSS (Cyber-audit glassmorphic theme)
* **Code Editor:** `@monaco-editor/react` (configured gracefully to bypass CDN blocking)
* **Component Primitives:** Radix UI, Lucide React

## 🔧 Getting Started

### 1. Installation

Clone the repository and install dependencies using npm:

```bash
git clone https://github.com/whoevenisshubham/eco-logic.git
cd eco-logic
npm install
```

### 2. Run Development Server

Launch the Vite development server:

```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Build & Deploy

Deploy directly to your `gh-pages` branch using the integrated deployment scripts:

```bash
npm run deploy
```

---

*Designed as a research project aiming to sit alongside top-tier observability tools like Datadog and Intel VTune.*
