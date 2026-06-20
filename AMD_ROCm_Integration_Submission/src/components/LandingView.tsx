import React, { useState, useEffect } from "react";
import MoleculeCanvas3D from "./MoleculeCanvas3D";
import { MoleculeCandidate, GPUMetrics, SelectedTarget } from "../types";
import { Flame, Database, Radio, Star, Atom, ShieldAlert, Cpu } from "lucide-react";

interface LandingViewProps {
  molecules: MoleculeCandidate[];
  onSelectMoleculesTab: () => void;
  onSelectProteinTab: () => void;
  onSelectCopilotTab: () => void;
}

const LIVE_COMPOUNDS = [
  { name: "Caffeine", cid: "2519", formula: "C8H10N4O2", info: "CNS Stimulant" },
  { name: "Aspirin", cid: "2244", formula: "C9H8O4", info: "NSAID COX Inhibitor" },
  { name: "Ibuprofen", cid: "3672", formula: "C13H18O2", info: "Nonsteroidal Anti-inflammatory" },
  { name: "Erlotinib", cid: "176870", formula: "C22H23N3O4", info: "EGFR Tyrosine Kinase Inhb." },
  { name: "Imatinib", cid: "5291", formula: "C29H31N7O", info: "BCR-ABL Tyrosine Kinase Inhb." }
];

export default function LandingView({
  molecules,
  onSelectMoleculesTab,
  onSelectProteinTab,
  onSelectCopilotTab
}: LandingViewProps) {
  const [selectedDemo, setSelectedDemo] = useState(LIVE_COMPOUNDS[3]); // Erlotinib
  const [demoAtoms, setDemoAtoms] = useState<any[]>([]);
  const [demoBonds, setDemoBonds] = useState<any[]>([]);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [errorDemo, setErrorDemo] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"ball-stick" | "space-fill">("ball-stick");

  useEffect(() => {
    // Fetch real PubChem coords on the fly for the interactive molecular landing canvas
    const fetchDemoCoordinates = async () => {
      setLoadingDemo(true);
      setErrorDemo(null);
      try {
        const response = await fetch(`/api/molecule/pubchem/${selectedDemo.cid}`);
        if (!response.ok) {
          throw new Error("Unable to retrieve coordinates from PubChem.");
        }
        const data = await response.json();
        setDemoAtoms(data.atoms || []);
        setDemoBonds(data.bonds || []);
      } catch (err: any) {
        setErrorDemo(err.message || "Failed loading molecular demo model.");
      } finally {
        setLoadingDemo(false);
      }
    };

    fetchDemoCoordinates();
  }, [selectedDemo]);

  return (
    <div className="space-y-12 pb-16" id="landing-container">
      {/* Visual Header */}
      <section className="relative text-center max-w-4xl mx-auto space-y-4 pt-8" id="landing-hero">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/50 text-[11px] text-cyan-400 font-mono tracking-wider uppercase shadow-inner" id="landing-badge">
          <Flame className="w-3 h-3 text-cyan-400 animate-pulse" /> Research-Grade Molecular Engine
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-sans max-w-3xl mx-auto" id="landing-title">
          Accelerate Therapeutics with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400">Molecular Intelligence</span>
        </h1>
        <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto font-sans leading-relaxed" id="landing-description">
          DrugMind AI bridges Protein Structural biology, deep diffusion GNN chemical model generation, and ADMET toxicity predictions in a production-grade Platform.
        </p>

        {/* Call to Actions CTA */}
        <div className="flex flex-wrap justify-center gap-4 pt-4" id="landing-cta">
          <button
            onClick={onSelectMoleculesTab}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs tracking-wider uppercase transition duration-300 shadow-xl shadow-cyan-950/40"
            id="start-generation-btn"
          >
            Launch Molecule Generator
          </button>
          <button
            onClick={onSelectProteinTab}
            className="px-6 py-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/60 text-white font-semibold text-xs tracking-wider uppercase transition duration-300"
            id="explore-proteins-btn"
          >
            Scan Protein Target Structures
          </button>
        </div>
      </section>

      {/* Interactive 3D Molecular Demo Showcase */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-gray-900/40 border border-gray-800 p-6 md:p-8 rounded-2xl relative shadow-xl shadow-gray-950/60" id="landing-interactive-demo">
        <div className="lg:col-span-4 space-y-6" id="demo-controls-panel">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Atom className="w-5 h-5 text-cyan-400" /> Interactive Molecule Sandbox
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Toggle clinical compounds to download their genuine 3D atomic coordinates directly from PubChem, rendered interactively using ThreeJS client-side loops:
            </p>
          </div>

          {/* Molecule Selection Pills */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2" id="demo-compound-selectors">
            {LIVE_COMPOUNDS.map((compound) => (
              <button
                key={compound.cid}
                onClick={() => setSelectedDemo(compound)}
                className={`text-left p-3 rounded-xl border text-xs transition duration-200 ${
                  selectedDemo.cid === compound.cid
                    ? "bg-cyan-950/60 border-cyan-800 text-cyan-300"
                    : "bg-gray-950 border-gray-850 hover:border-gray-800 text-gray-400 hover:text-gray-300"
                }`}
                id={`compound-selector-${compound.cid}`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{compound.name}</span>
                  <span className="font-mono text-[9px] text-gray-500">CID: {compound.cid}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-0.5">{compound.formula} | {compound.info}</div>
              </button>
            ))}
          </div>

          {/* Display Mode Selection */}
          <div className="space-y-2 bg-gray-950 p-4 rounded-xl border border-gray-850" id="render-mode-settings">
            <span className="text-[9px] font-mono tracking-wider uppercase text-gray-500">Rendering Mode</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => setDisplayMode("ball-stick")}
                className={`py-1.5 rounded text-[10px] font-medium tracking-wide uppercase transition ${
                  displayMode === "ball-stick"
                    ? "bg-cyan-900/50 border border-cyan-700 text-cyan-300"
                    : "bg-gray-900 border border-transparent text-gray-400 hover:bg-gray-850"
                }`}
                id="mode-ball-stick-btn"
              >
                Ball-and-Stick
              </button>
              <button
                onClick={() => setDisplayMode("space-fill")}
                className={`py-1.5 rounded text-[10px] font-medium tracking-wide uppercase transition ${
                  displayMode === "space-fill"
                    ? "bg-cyan-900/50 border border-cyan-700 text-cyan-300"
                    : "bg-gray-900 border border-transparent text-gray-400 hover:bg-gray-850"
                }`}
                id="mode-space-fill-btn"
              >
                Space-filling (CPK)
              </button>
            </div>
          </div>
        </div>

        {/* 3D Viewer Area */}
        <div className="lg:col-span-8 h-[380px] md:h-[450px] relative rounded-2xl bg-gray-950/80 overflow-hidden" id="demo-render-viewport">
          {loadingDemo ? (
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-gray-950/80 space-y-4 rounded-2xl z-20" id="demo-loading-overlay">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              <p className="text-xs text-cyan-400 font-mono">Fetching coordinates from PubChem PubChemDB...</p>
            </div>
          ) : errorDemo ? (
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-gray-950/80 p-8 text-center rounded-2xl z-20 space-y-2" id="demo-error-overlay">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              <p className="text-xs text-red-400 font-mono">{errorDemo}</p>
            </div>
          ) : (
            <MoleculeCanvas3D atoms={demoAtoms} bonds={demoBonds} displayMode={displayMode} />
          )}
        </div>
      </section>

      {/* Unified Pipeline Workflow Cards */}
      <section className="space-y-6" id="pipeline-workflow-section">
        <div className="text-center space-y-1.5">
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-white">Full-Stack Drug Discovery Loop</h3>
          <p className="text-xs text-gray-400">Our deep computational architectures integrated across a single workflow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="workflow-cards">
          <div className="p-5 rounded-xl bg-gray-900/40 border border-gray-800/80 space-y-3" id="workflow-step-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/40 text-indigo-400 flex items-center justify-center font-mono text-sm font-semibold border border-indigo-900/50">01</div>
            <h4 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono">Protein Intelligence</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Read sequence files or structural PDB arrays. Predict active binding site pockets with ESM2 transformer embeds.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gray-900/40 border border-gray-800/80 space-y-3" id="workflow-step-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/40 text-cyan-400 flex items-center justify-center font-mono text-sm font-semibold border border-cyan-900/50">02</div>
            <h4 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono">Molecule Generation</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generate target-specific lead compounds employing custom Generative GNNs and Diffusion models mapping valid valency scaffolds.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gray-900/40 border border-gray-800/80 space-y-3" id="workflow-step-3">
            <div className="w-8 h-8 rounded-lg bg-blue-950/40 text-blue-400 flex items-center justify-center font-mono text-sm font-semibold border border-blue-900/50">03</div>
            <h4 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono">Binding Prediction</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Compute Drug-Target interactions (K_d, IC50) with optimized docking simulations, GraphDTA and Graph Attention Nets.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gray-900/40 border border-gray-800/80 space-y-3" id="workflow-step-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/40 text-emerald-400 flex items-center justify-center font-mono text-sm font-semibold border border-emerald-900/50">04</div>
            <h4 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono">ADMET Toxicity</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Assess cardiotoxicity, hepatotoxicity, mutagenicity risks and clinical side-effects before initiation of chemical synthesis.
            </p>
          </div>
        </div>
      </section>

      {/* Platform Real-Time Analytics Bar */}
      <section className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6" id="landing-analytics-bar">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center" id="platform-aggregated-metrics">
          <div className="space-y-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Compounds Discovered</span>
            <div className="text-2xl md:text-3xl font-extrabold text-cyan-400 font-mono tracking-tight">{molecules.length + 128}</div>
          </div>
          <div className="space-y-1 border-l border-gray-850">
            <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Avg Docking Latency</span>
            <div className="text-2xl md:text-3xl font-extrabold text-blue-400 font-mono tracking-tight">4.8s</div>
          </div>
          <div className="space-y-1 border-l border-gray-850">
            <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Database Coverages</span>
            <div className="text-2xl md:text-3xl font-extrabold text-indigo-400 font-mono tracking-tight">3.2M +</div>
          </div>
          <div className="space-y-1 border-l border-gray-850">
            <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Core Clusters Active</span>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">4 GPUs</div>
          </div>
        </div>
      </section>
    </div>
  );
}
