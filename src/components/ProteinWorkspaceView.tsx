import React, { useState } from "react";
import MoleculeCanvas3D from "./MoleculeCanvas3D";
import { SelectedTarget, ParsedAtom } from "../types";
import { Search, Loader2, Sparkles, Box, ShieldEllipsis, AlertTriangle } from "lucide-react";

interface ProteinWorkspaceViewProps {
  targets: SelectedTarget[];
  onAnalyzeProtein: (pdbId: string) => Promise<{ success: boolean; protein: SelectedTarget; atoms: ParsedAtom[] } | void>;
}

export default function ProteinWorkspaceView({
  targets,
  onAnalyzeProtein
}: ProteinWorkspaceViewProps) {
  const [pdbQuery, setPdbQuery] = useState("1M17"); // Defaulting to clinical EGFR model
  const [activeProtein, setActiveProtein] = useState<SelectedTarget | null>(targets[0] || null);
  const [proteinAtoms, setProteinAtoms] = useState<ParsedAtom[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handlePdbSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdbQuery.trim()) return;

    setLoading(true);
    setErrorText(null);
    try {
      const res = await onAnalyzeProtein(pdbQuery.trim());
      if (res && res.success) {
        setActiveProtein(res.protein);
        setProteinAtoms(res.atoms);
      } else {
        throw new Error("Unable to parse PDB. Verify ID format is valid.");
      }
    } catch (err: any) {
      setErrorText(err.message || "Failed retrieving macromolecule structure from RCSB service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn" id="protein-workspace-container">
      {/* Search Header Form */}
      <section className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center" id="protein-search-bar">
        <div className="md:col-span-8 space-y-1.5" id="search-bar-headline">
          <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400 font-mono">Structural Biology Scanner</h3>
          <p className="text-xs text-gray-400 font-sans leading-relaxed">
            Specify any valid 4-character Protein Data Bank catalog ID (e.g., <span className="font-mono text-cyan-300">1M17</span> for EGFR, <span className="font-mono text-cyan-300">6LU7</span> for COVID-19 main protease, or <span className="font-mono text-cyan-300">1EQG</span> for estrogen receptor). We query RCSB on-the-fly and deploy deep biochemists to extract amino sequences and pocket residues.
          </p>
        </div>

        <form onSubmit={handlePdbSearch} className="md:col-span-4 flex gap-2" id="protein-input-form">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. 1M17"
              value={pdbQuery}
              onChange={(e) => setPdbQuery(e.target.value.toUpperCase())}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-600"
              maxLength={4}
              id="pdb-input-field"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 flex items-center gap-1.5"
            id="query-pdb-btn"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Scan Target"}
          </button>
        </form>
      </section>

      {/* Main Structural Display Area */}
      {errorText && (
        <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl flex items-center gap-2.5 text-xs text-red-300 font-mono" id="protein-analyzer-error">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Error parsing coordinate files: {errorText}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="protein-layout-grid">
        {/* Left Column: 3D Visualization Canvas */}
        <div className="lg:col-span-7 h-[450px] md:h-[550px]" id="protein-viewport-card">
          {activeProtein ? (
            <div className="w-full h-full relative" id="protein-renderer-mount">
              {loading && (
                <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-3 rounded-2xl" id="protein-loading-spinner">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-xs text-cyan-300 font-mono">Parsing Protein Coordinates & Computing Binding Sites...</p>
                </div>
              )}
              {proteinAtoms.length > 0 ? (
                <MoleculeCanvas3D atoms={proteinAtoms} displayMode="backbone" />
              ) : (
                <div className="w-full h-full bg-gray-950/80 rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-center p-6 space-y-3" id="fallback-protein">
                  <Box className="w-12 h-12 text-gray-700" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">No atoms loaded</h4>
                    <p className="text-[10px] text-gray-500 max-w-xs mt-1">Please fetch and parse active atom files on top</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-gray-950/40 rounded-2xl border border-gray-800 flex flex-col items-center justify-center p-8 space-y-3" id="fallback-protein-generic">
              <Sparkles className="w-8 h-8 text-gray-600" />
              <p className="text-xs text-gray-400 font-mono">Enter PDB ID to initiate macromolecular parser</p>
            </div>
          )}
        </div>

        {/* Right Column: Target Structural Metadata Description, Pockets Table & Sequences */}
        <div className="lg:col-span-5 space-y-6" id="protein-detailed-metadata">
          {activeProtein && (
            <>
              {/* General Biography */}
              <div className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-3" id="target-biography-card">
                <div className="flex items-center justify-between border-b border-gray-850 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-mono">Target Profile</h4>
                  <span className="font-mono text-xs bg-cyan-950 text-cyan-400 px-2.5 py-0.5 rounded border border-cyan-900 font-bold">{activeProtein.pdbId}</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-sm font-extrabold text-white">{activeProtein.name}</h2>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400" id="protein-stats-capsules">
                    <div className="bg-gray-900/40 p-2 rounded border border-gray-850">
                      <span className="text-gray-500 block">Resolution</span>
                      <span className="text-gray-200 font-bold">{activeProtein.resolution}</span>
                    </div>
                    <div className="bg-gray-900/40 p-2 rounded border border-gray-850">
                      <span className="text-gray-500 block">Organism Origin</span>
                      <span className="text-gray-200 font-bold">{activeProtein.organism}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed">{activeProtein.description}</p>
                </div>
              </div>

              {/* Active Sites Resides Table */}
              <div className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-3" id="active-pockets-table-card">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 font-mono">Key Residues & Active Sites</h4>
                <div className="overflow-x-auto" id="active-sites-table-mount">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead>
                      <tr className="border-b border-gray-850 text-gray-500 text-[10px] font-mono uppercase">
                        <th className="pb-2">Residue</th>
                        <th className="pb-2">ID Position</th>
                        <th className="pb-2">Pathways Mechanics</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850 font-sans text-xs">
                      {activeProtein.activeSites?.map((site, i) => (
                        <tr key={i} className="hover:bg-gray-900/20" id={`residue-item-${i}`}>
                          <td className="py-2 font-mono text-cyan-400 font-bold">{site.residue}</td>
                          <td className="py-2 font-mono text-gray-300">{site.position}</td>
                          <td className="py-2 text-[11px] text-gray-400">{site.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Binding Volume Pockets */}
              <div className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-3" id="druggable-pockets-section">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 font-mono">Druggability Binding Pockets</h4>
                <div className="space-y-2" id="pockets-list-display">
                  {activeProtein.pockets?.map((pocket, i) => (
                    <div key={i} className="bg-gray-900/30 p-3 rounded-lg border border-gray-850 flex items-center justify-between" id={`pocket-info-${i}`}>
                      <div>
                        <span className="text-[11px] font-bold text-gray-200 block">{pocket.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">Est. Cavity Volume • {pocket.volume}</span>
                      </div>

                      <div className="text-right" id={`druggability-rating-${i}`}>
                        <span className="text-[10px] font-mono text-gray-500 block uppercase">Bio Score</span>
                        <span className={`text-xs font-mono font-bold ${pocket.druggability > 0.8 ? "text-emerald-400" : "text-amber-500"}`}>
                          {(pocket.druggability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sequential Amino Acids Index */}
              <div className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-2" id="amino-acids-sequence-panel">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 font-mono">Extracted Amino Acids Sequence</h4>
                <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-850 font-mono text-[10px] text-gray-450 overflow-x-auto max-w-full leading-normal whitespace-pre-wrap select-all" id="sequence-text-element">
                  {activeProtein.sequence}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
