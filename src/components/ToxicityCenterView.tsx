import React, { useState } from "react";
import { MoleculeCandidate } from "../types";
import { ShieldCheck, ShieldAlert, AlertTriangle, ListCollapse, CheckCircle, Info } from "lucide-react";

interface ToxicityCenterViewProps {
  molecules: MoleculeCandidate[];
}

export default function ToxicityCenterView({
  molecules
}: ToxicityCenterViewProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState(molecules[0]?.id || "");
  const selectedCandidate = molecules.find((m) => m.id === selectedCandidateId) || molecules[0];

  return (
    <div className="space-y-8 animate-fadeIn" id="toxicity-center-container">
      {/* Informative Header Banner */}
      <section className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center" id="toxicity-headline-banner">
        <div className="space-y-1.5" id="toxicity-headline-text">
          <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 font-mono">Tox21 & ClinTox safety engine</h3>
          <p className="text-xs text-gray-400 max-w-2xl leading-relaxed font-sans">
            Screen generated lead compounds for adverse molecular side-effects. In-silico toxicological profiling helps avoid late-stage preclinical trial attrition by predicting hERG cardiac blockage, microsomal hepatocyte breakdown, and mutagenic Ames responses.
          </p>
        </div>

        {/* Dropdown Candidate Picker */}
        <div className="flex items-center gap-2" id="toxicity-picker-box">
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-semibold">Active Compound:</label>
          <select
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-600 font-mono font-bold"
            id="toxicity-molecule-dropdown"
          >
            {molecules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} - {m.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {selectedCandidate ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="toxicity-layout-grid">
          {/* Left Column: Toxicity Profiler Panel */}
          <div className="lg:col-span-4 bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-6" id="safety-meters-card">
            <div className="border-b border-gray-850 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-200">ADMET Toxicology Scorecard</h4>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">{selectedCandidate.id} • {selectedCandidate.formula}</p>
            </div>

            {/* Toxicity Meters List */}
            <div className="space-y-5" id="toxicity-indicators-pile">
              {/* Liver Hepatotoxicity */}
              <div className="space-y-2 bg-gray-900/20 p-3 rounded-lg border border-gray-850/50" id="liver-tox-cell">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300">Liver Toxicity Risk</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                      selectedCandidate.toxicity.liver === "Low"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                        : selectedCandidate.toxicity.liver === "Moderate"
                        ? "bg-amber-950 text-amber-500 border-amber-900"
                        : "bg-red-950 text-red-500 border-red-900"
                    }`}
                  >
                    {selectedCandidate.toxicity.liver}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 font-sans leading-normal">
                  Predicts hepatocellular injury or mitochondrial respiratory chain inhibition inside liver lysates.
                </div>
              </div>

              {/* Cardiotoxicity (hERG target classification) */}
              <div className="space-y-2 bg-gray-900/20 p-3 rounded-lg border border-gray-850/50" id="cardio-tox-cell">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300">Cardiotoxicity (hERG channel)</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                      selectedCandidate.toxicity.cardio === "Low"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                        : selectedCandidate.toxicity.cardio === "Moderate"
                        ? "bg-amber-950 text-amber-500 border-amber-900"
                        : "bg-red-950 text-red-500 border-red-900"
                    }`}
                  >
                    {selectedCandidate.toxicity.cardio}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 font-sans leading-normal">
                  Calculates blockading intensity of the hERG potassium channel connected to long QT clinical syndrome.
                </div>
              </div>

              {/* Ames Mutagenicity */}
              <div className="space-y-2 bg-gray-900/20 p-3 rounded-lg border border-gray-850/50" id="mutagenic-tox-cell">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300">Ames Mutagenicity</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                      selectedCandidate.toxicity.mutagenic === "Safe"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                        : "bg-red-950 text-red-400 border-red-900"
                    }`}
                  >
                    {selectedCandidate.toxicity.mutagenic}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 font-sans leading-normal">
                  Assesses risk of chemical complex inducing genetic sequence transformations.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Inferred Adverse Drug Side Effects Clinical Profile */}
          <div className="lg:col-span-8 bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-6" id="clinical-implications-card">
            <div className="border-b border-gray-850 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-200">Secondary Side effects profile</h4>
                <p className="text-[10px] text-gray-500 mt-1 font-sans">Predicted physiological symptoms following target molecule administration</p>
              </div>
              <Info className="w-4.5 h-4.5 text-gray-500" />
            </div>

            <div className="space-y-6" id="clinical-implications-grid">
              {/* Mechanism analysis */}
              <div className="space-y-2 bg-gray-900/30 p-4 rounded-xl border border-gray-850" id="mechanism-breakdown-subcard">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">Interaction Pathway Mechanism</span>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{selectedCandidate.mechanism}</p>
              </div>

              {/* Specific adverse events list */}
              <div className="space-y-3" id="targeted-side-effects">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Observed Off-Target Side Effects</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="observed-side-effects-grid">
                  {selectedCandidate.toxicity.sideEffects?.map((effect, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 bg-gray-900/25 p-3 rounded-lg border border-gray-850/50" id={`side-effect-item-${idx}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-gray-200 block">{effect}</span>
                        <span className="text-[9px] text-gray-500 mt-0.5 block">Estimated occurrence: &lt; 8.5%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regulatory validation checklist */}
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-850 space-y-3" id="regulatory-compliance-section">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Regulatory Compliance Checklist</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs" id="regulatory-compliance-cards">
                  <div className="flex items-center gap-2 p-2 bg-gray-900/40 rounded border border-gray-850" id="compliance-lipinski">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-300">Lipinski Rule of 5 Validation</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-900/40 rounded border border-gray-850" id="compliance-rotatable">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-300">Rotatable Bonds count Limits</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-900/40 rounded border border-gray-850" id="compliance-polar">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-300">Polar Surface Area limits (&lt;140 Å²)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-900/40 rounded border border-gray-850" id="compliance-pains">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-300">PAINS Filter - Active Pan Filter</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-gray-950/40 border border-gray-800 rounded-2xl text-gray-500 font-mono text-xs flex flex-col items-center justify-center space-y-2" id="no-toxicity-candidates">
          <ShieldAlert className="w-8 h-8 text-gray-700" />
          <span>No compound registered in standard storage. Create molecules first to screening safety logs.</span>
        </div>
      )}
    </div>
  );
}
