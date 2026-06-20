import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import LandingView from "./components/LandingView";
import DashboardView from "./components/DashboardView";
import ProteinWorkspaceView from "./components/ProteinWorkspaceView";
import MolecularGeneratorView from "./components/MolecularGeneratorView";
import ToxicityCenterView from "./components/ToxicityCenterView";
import PaperAnalyzerView from "./components/PaperAnalyzerView";
import CopilotView from "./components/CopilotView";
import { MoleculeCandidate, SelectedTarget, ResearchPaper, GPUMetrics, ExperimentJob, ChatMessage } from "./types";
import {
  Flame,
  LayoutDashboard,
  Dna,
  Cpu,
  ShieldCheck,
  FileText,
  MessageSquare,
  Sparkles,
  Database,
  Radio,
  ArrowRight
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"landing" | "dashboard" | "protein" | "generation" | "toxicity" | "papers" | "copilot">("landing");

  // Global Frontend State Synced Across Clients via Server Sent Events (SSE) Source
  const [molecules, setMolecules] = useState<MoleculeCandidate[]>([]);
  const [targets, setTargets] = useState<SelectedTarget[]>([]);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [gpuMetrics, setGpuMetrics] = useState<GPUMetrics[]>([]);
  const [jobs, setJobs] = useState<ExperimentJob[]>([]);

  // Synchronous aggregated statistics
  const [dashboardStats, setDashboardStats] = useState({
    moleculesCount: 0,
    targetsAnalyzed: 0,
    extractedPapers: 0,
    runningWorkers: 0,
    clusterGPUUtilization: 0
  });

  // Establishes modern Event Stream socket bindings on mount for instantaneous real-time sync
  useEffect(() => {
    console.log("Connecting real-time SSE stream channel...");
    const sse = new EventSource("/api/realtime/stream");

    sse.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📡 SSE Event received: ${data.type}`);

        switch (data.type) {
          case "SYNC_INITIAL_STATE":
            setMolecules(data.payload.molecules || []);
            setTargets(data.payload.targets || []);
            setPapers(data.payload.papers || []);
            setGpuMetrics(data.payload.gpuMetrics || []);
            setJobs(data.payload.jobs || []);
            break;

          case "GPU_METRICS_UPDATE":
            setGpuMetrics(data.payload);
            break;

          case "JOB_STATUS_UPDATE":
            setJobs(data.payload);
            break;

          case "MoleculeGenerated":
            setMolecules((prev) => {
              // Deduplicate generated molecules
              const exists = prev.some((m) => m.id === data.payload.id);
              return exists ? prev : [data.payload, ...prev];
            });
            break;

          case "ProteinAnalyzed":
            setTargets((prev) => {
              const exists = prev.some((t) => t.pdbId === data.payload.pdbId);
              return exists ? prev : [data.payload, ...prev];
            });
            break;

          case "ReportCreated":
            setPapers((prev) => {
              const exists = prev.some((p) => p.id === data.payload.id);
              return exists ? prev : [data.payload, ...prev];
            });
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Failed parsing SSE frame data", err);
      }
    });

    sse.onerror = (err) => {
      console.warn("SSE connection closed or lost. Attempting automated retry sync...", err);
    };

    return () => {
      sse.close();
    };
  }, []);

  // Polls synchronized aggregated global metrics
  useEffect(() => {
    const fetchAggregatedStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setDashboardStats(data);
        }
      } catch (err) {
        console.warn("Trouble pulling aggregated statistics from backend server.", err);
      }
    };

    fetchAggregatedStats();
    const loopInterval = setInterval(fetchAggregatedStats, 5000);
    return () => clearInterval(loopInterval);
  }, [molecules, targets, papers, jobs]);

  // Client-Side action endpoints orchestrators

  const handleAnalyzeProtein = async (pdbId: string) => {
    try {
      const res = await fetch(`/api/protein/pdb/${pdbId}`);
      if (res.ok) {
        const data = await res.json();
        return data; // returns success, protein target metadata, atoms coords
      }
    } catch (err) {
      console.error("Analytical protein scanning fails", err);
    }
  };

  const handleGenerateMolecule = async (targetDisease: string, criteria: string) => {
    try {
      const response = await fetch("/api/molecule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDisease, criteria })
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (err) {
      console.error("Generative module fails", err);
    }
  };

  const handleAnalyzePaper = async (rawText: string, title?: string) => {
    try {
      const response = await fetch("/api/paper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, title })
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (err) {
      console.error("Academic entity extraction fails", err);
    }
  };

  const handleSendMessage = async (message: string, history: ChatMessage[]) => {
    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history })
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (err) {
      console.error("Copilot reasoning fails", err);
    }
  };

  const handleTriggerExperiment = async (type: string) => {
    try {
      const response = await fetch("/api/experiments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${type} Training Cycle`,
          type: type,
          target: targets[0]?.pdbId || "1M17"
        })
      });
      if (response.ok) {
        const data = await response.json();
        console.log("GNN Experiment launched safely", data);
      }
    } catch (err) {
      console.error("MLOps job dispatcher yields error", err);
    }
  };

  const handleToggleGpu = async (gpuId: string) => {
    try {
      const response = await fetch("/api/gpu/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gpuId })
      });
      if (response.ok) {
        const data = await response.json();
        console.log("GPU Compute Node toggled successfully", data);
      }
    } catch (err) {
      console.error("Failed toggling target GPU worker node", err);
    }
  };

  const handleStopExperiment = async (jobId: string) => {
    try {
      const response = await fetch("/api/experiments/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Experiment job terminated successfully", data);
      }
    } catch (err) {
      console.error("Failed stopping active experiment job", err);
    }
  };

  const handleDeleteExperiment = async (jobId: string) => {
    try {
      const response = await fetch("/api/experiments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Experiment job record deleted safely", data);
      }
    } catch (err) {
      console.error("Failed deleting experiment job record", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080c] text-white flex flex-col font-sans selection:bg-cyan-500/25 selection:text-cyan-300" id="drugmind-root">
      {/* Premium Platform Header Navbar Layout */}
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center" id="platform-navbar">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab("landing")} id="brand-logo-area">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center border border-cyan-400/30 font-bold tracking-tight text-white shadow-lg shadow-cyan-950/50" id="platform-avatar-badge">
            DM
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white font-sans uppercase">DrugMind <span className="text-cyan-400">AI</span></h1>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block font-medium">Molecular Intelligence</span>
          </div>
        </div>

        {/* Dynamic Navigations Pills */}
        <nav className="hidden lg:flex items-center gap-1 relative bg-white/[0.03] border border-white/10 p-1 rounded-xl shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.15),0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl" id="navbar-links">
          {([
            { id: "landing", label: "Platform Overview", icon: <Flame className="w-3.5 h-3.5 text-cyan-400" /> },
            { id: "dashboard", label: "Control Dashboard", icon: <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" /> },
            { id: "protein", label: "Protein Workspace", icon: <Dna className="w-3.5 h-3.5 text-emerald-400" /> },
            { id: "generation", label: "Novel Generator", icon: <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> },
            { id: "toxicity", label: "Toxicity Center", icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> },
            { id: "papers", label: "Paper Analyzer", icon: <FileText className="w-3.5 h-3.5 text-indigo-400" /> },
            { id: "copilot", label: "AI Copilot", icon: <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> }
          ] as const).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5 cursor-pointer z-10 ${
                  isActive ? "text-cyan-300 font-extrabold" : "text-gray-400 hover:text-white"
                }`}
                id={`nav-${tab.id}-tab`}
              >
                {isActive && (
                  <motion.div
                    layoutId="liquid-glass-indicator"
                    className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/15 to-white/5 border-t border-white/20 border-b border-black/35 backdrop-blur-md -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    style={{
                      boxShadow: "inset 0 1px 1.5px rgba(255,255,255,0.3), inset 0 -0.5px 0.5px rgba(0,0,0,0.15), 0 4px 14px rgba(6, 182, 212, 0.25)"
                    }}
                  />
                )}
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Global Cluster Sync Monitor indicator */}
        <div className="flex items-center gap-2 text-xs font-mono bg-gray-900 border border-gray-800 px-3.5 py-1.5 rounded-lg text-gray-400" id="sync-cluster-indicator">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
          <span>Real-time Stream Synced</span>
        </div>
      </header>

      {/* Mini-Mobile Nav Rail Helper display - iOS 26 Liquid Glass */}
      <div className="lg:hidden bg-white/[0.02] border-b border-white/5 p-2 overflow-x-auto flex gap-1.5 relative backdrop-blur-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] font-sans" id="mobile-nav-slider">
        {([
          { id: "landing", label: "Overview" },
          { id: "dashboard", label: "Dashboard" },
          { id: "protein", label: "Protein" },
          { id: "generation", label: "Generator" },
          { id: "toxicity", label: "Toxicity" },
          { id: "papers", label: "Papers" },
          { id: "copilot", label: "Copilot" }
        ] as const).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-3 py-1 text-[9.5px] uppercase font-extrabold rounded-lg tracking-wider transition-all duration-300 cursor-pointer shrink-0 z-10 ${
                isActive ? "text-cyan-300 font-extrabold" : "text-gray-400"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-glass-indicator"
                  className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/12 to-white/4 border-t border-white/15 border-b border-black/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_8px_rgba(6,182,212,0.15)] -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 26 }}
                />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Responsive Layout Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8" id="platform-workspace">
        {activeTab === "landing" && (
          <LandingView
            molecules={molecules}
            onSelectMoleculesTab={() => setActiveTab("generation")}
            onSelectProteinTab={() => setActiveTab("protein")}
            onSelectCopilotTab={() => setActiveTab("copilot")}
          />
        )}

        {activeTab === "dashboard" && (
          <DashboardView
            molecules={molecules}
            gpuMetrics={gpuMetrics}
            jobs={jobs}
            stats={dashboardStats}
            onSelectMolecule={(mol) => {
              setActiveTab("generation");
            }}
            onTriggerExperiment={handleTriggerExperiment}
            onToggleGpu={handleToggleGpu}
            onStopJob={handleStopExperiment}
            onDeleteJob={handleDeleteExperiment}
          />
        )}

        {activeTab === "protein" && (
          <ProteinWorkspaceView
            targets={targets}
            onAnalyzeProtein={handleAnalyzeProtein}
          />
        )}

        {activeTab === "generation" && (
          <MolecularGeneratorView
            molecules={molecules}
            onGenerateMolecule={handleGenerateMolecule}
          />
        )}

        {activeTab === "toxicity" && (
          <ToxicityCenterView
            molecules={molecules}
          />
        )}

        {activeTab === "papers" && (
          <PaperAnalyzerView
            papers={papers}
            onAnalyzePaper={handleAnalyzePaper}
          />
        )}

        {activeTab === "copilot" && (
          <CopilotView
            targets={targets}
            molecules={molecules}
            onSendMessage={handleSendMessage}
          />
        )}
      </main>

      {/* Modern Compact Footers */}
      <footer className="border-t border-gray-900 bg-gray-950 p-6 text-center text-xs text-gray-500 font-mono flex flex-col md:flex-row justify-between items-center gap-4" id="platform-footer">
        <div>
          <span>© 2026 DrugMind AI Inc. • Registered Clinical Research Protocol</span>
        </div>
        <div className="flex gap-4" id="footer-db-status">
          <span className="text-[10px] text-gray-500">ChEMBL DB v33</span>
          <span className="text-gray-700">|</span>
          <span className="text-[10px] text-gray-500">PubChem 3D Bio-Coordinates</span>
          <span className="text-gray-700">|</span>
          <span className="text-[10px] text-gray-500">RCSB PDB Server Sync</span>
        </div>
      </footer>
    </div>
  );
}
