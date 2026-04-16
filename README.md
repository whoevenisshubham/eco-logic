# EcoLogic: AI-Driven Software Energy Profiler

> A high-performance, intelligent software energy profiler dashboard designed to make energy consumption a first-class metric in software engineering.

![Status: Active](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Tech: React 18](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)
![Tech: FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi)
![Tech: D3.js](https://img.shields.io/badge/D3.js-7.9-F9A03C?style=for-the-badge&logo=d3.js)

**EcoLogic** is a complete architecture for ingesting AST-driven telemetry data, deep-linking performance spikes back to origin code, and visualizing multi-dimensional metrics at scale. By combining a React-based interactive frontend with a Python-powered AST processing backend, EcoLogic enables developers to optimize their code footprint in real-time.

---

## ✨ Core Features

* **AST-Driven Energy Heuristics**: Analyzes Python Abstract Syntax Trees (AST) dynamically via a FastAPI backend to calculate execution depth, memory pressure, and estimated energy footprints in Joules.
* **GreenGenie AI (RAG Pipeline)**: Integrates directly with LLMs (Google Gemini) by injecting the top-3 most energy-expensive AST nodes into the context window for targeted, intelligent optimization suggestions.
* **Custom Visualizations**:
  * **Time-Series Profiler**: Continuous sub-millisecond footprint plotting downsampled for high performance.
  * **5-Axis Complexity Radar**: Multi-metric code analysis (AST Depth, Loop Pressure, Memory Ops, Function Calls, footprint).
  * **Sunburst Profiler**: Hierarchical, interactive ring charts with deep breadcrumb trailing.
  * **Energy Flame Graph**: Top-down stack depth vs. runtime tracing with dynamic height scaling.
  * **Differential Profiling**: A/B test functions side-by-side with localized metrics.
* **Semantic Traceability**: Integrated **Monaco Editor** overlays line-by-line heatmap analytics mapped directly from the backend's footprint heuristics.
* **Enterprise CI/CD & Cloud Reporting**: 
  * CI/CD energy budget simulation (detecting footprint spikes before merging).
  * Cloud impact converter translating Joules to Carbon (gCO2eq) and AWS cost metrics based on operational scale.
* **Dynamic Grid Layout**: Fully responsive, draggable, and dynamic window pane management via `react-grid-layout`.
* **Export to PDF**: Generate clean, print-friendly reports instantly natively through the browser.

## 🛠️ Architecture & Tech Stack

### Frontend (React / Vite)
* **Framework:** React 18 (TypeScript) / Vite
* **State Management:** Zustand
* **Visualizations:** D3.js, Recharts
* **Animations:** Framer Motion
* **Styling:** Tailwind CSS
* **Code Editor:** `@monaco-editor/react`

### Backend (Python / FastAPI)
* **Framework:** FastAPI (Uvicorn)
* **Analysis:** Native Python `ast` module
* **AI Integration:** Google Generative AI (`gemini-1.5-flash`)
* **Compute Engine:** Custom AST footprint matching algorithms

## 🔧 Getting Started

### 1. Requirements
* Node.js v18+
* Python 3.10+

### 2. Setup the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
*The backend will boot up on `http://127.0.0.1:8000`.*

### 3. Setup the Frontend

In a new terminal window:
```bash
npm install
npm run dev
```
*Vite will start the dev server (usually on `http://localhost:5173`).*

---

*Built for modern development teams to construct efficient, carbon-conscious, and blazingly fast algorithmic infrastructures.*
