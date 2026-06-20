import React, { useState } from "react";
import { ResearchPaper } from "../types";
import { FileText, Loader2, Sparkles, BookOpen, Layers, Microscope } from "lucide-react";

interface PaperAnalyzerViewProps {
  papers: ResearchPaper[];
  onAnalyzePaper: (rawText: string, title?: string) => Promise<any>;
}

const SAMPLE_PAPER_TEXTS = [
  {
    title: "Allosteric Inhibition of mutated EGFR Tyrosine Kinase in lung carcinoma cells",
    excerpt: "We report the identification of DM-EGFR-001, a highly potent covalent tyrosine kinase inhibitor targeting EGFR T790M and C797S resistance mutations in NSCLC. Binding affinity measurements show an IC50 of 2.1 nM. Cellular assays validated that the compound maintains selectivity while exhibiting no observable hepatotoxicity."
  },
  {
    title: "Structural basis of SARS-CoV-2 Mpro blockage via novel synthetic scaffolds",
    excerpt: "During screening of chemical files, compound Nirmatrelvir was found to competitively block COVID-19 main protease (Mpro / 3CLpro) at 8.4 nM affinity. Resides Cys-145 and His-41 form close coordinate hydrogen bonds stabilizing the primary active site. Toxicity markers reveal stable cardio profiles with low Ames mutability scores."
  }
];

export default function PaperAnalyzerView({
  papers,
  onAnalyzePaper
}: PaperAnalyzerViewProps) {
  const [rawText, setRawText] = useState("");
  const [paperTitle, setPaperTitle] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedResult, setExtractedResult] = useState<ResearchPaper | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const triggerExtractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setAnalyzing(true);
    setExtractedResult(null);
    setErrorText(null);

    try {
      const res = await onAnalyzePaper(rawText.trim(), paperTitle.trim() || undefined);
      if (res && res.success) {
        setExtractedResult(res.paper);
      } else {
        throw new Error("Parser node rejected scientific manuscript input format.");
      }
    } catch (err: any) {
      setErrorText(err.message || "Failed parsing PDF manuscript text.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn" id="paper-analyzer-tab-container">
      {/* Platform Description Header */}
      <section className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-1.5" id="analyzer-hero-banner">
        <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 font-mono">Scientific Literature Intelligence Node</h3>
        <p className="text-xs text-gray-400 max-w-2xl leading-relaxed font-sans">
          Index new molecules directly from scientific journals (PubMed, ChemRxiv, BioRxiv). Paste publication abstracts, or raw text excerpts. Extracted chemical entities and targets are linked to vector spaces for retrieval-guided semantic search query cycles.
        </p>
      </section>

      {/* Input Formulation / Quick Draft Area */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="manuscript-layout-grid">
        <div className="lg:col-span-6 bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-4" id="document-input-box">
          <div className="flex items-center justify-between border-b border-gray-850 pb-3" id="document-headline">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-200">Submit Manuscript Draft</h4>
            <span className="text-[10px] font-mono text-gray-500">AI Entity Extraction</span>
          </div>

          {/* Quick Preset Paste buttons */}
          <div className="space-y-2" id="paper-presets-container">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Suggested Manuscripts</span>
            <div className="grid grid-cols-1 gap-2" id="predefined-manuscripts">
              {SAMPLE_PAPER_TEXTS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPaperTitle(p.title);
                    setRawText(p.excerpt);
                  }}
                  className="text-left p-3 rounded-lg bg-gray-900 border border-gray-850 hover:border-gray-800 transition text-xs space-y-1"
                  id={`preset-manuscript-${i}`}
                >
                  <span className="font-semibold block text-gray-300">{p.title}</span>
                  <span className="text-[10px] text-gray-500 block truncate">{p.excerpt}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={triggerExtractor} className="space-y-4" id="extractor-form-action">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block">Publication Title (Optional)</label>
              <input
                type="text"
                placeholder="Inferred automatically if left blank"
                value={paperTitle}
                onChange={(e) => setPaperTitle(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-cyan-600 font-sans"
                id="manuscript-title-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block">Manuscript Text Excerpt / Patent Claims</label>
              <textarea
                rows={5}
                placeholder="Paste relevant publication paragraphs summarizing binding scores or structural inhibitors..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-cyan-600 font-sans"
                id="manuscript-excerpt-input"
              />
            </div>

            <button
              type="submit"
              disabled={analyzing}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-widest uppercase rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              id="analyze-manuscript-btn"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing document vectors...
                </>
              ) : (
                <>
                  <Microscope className="w-4 h-4" />
                  Analyze and Store Extracted Entities
                </>
              )}
            </button>
          </form>

          {errorText && (
            <div className="p-3 bg-red-950/40 border border-red-900/60 text-red-400 rounded-lg text-xs font-mono" id="extractor-errors">
              Analysis failed: {errorText}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Extraction Visual Output */}
        <div className="lg:col-span-6 h-[480px] bg-gray-950/60 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between overflow-hidden" id="extraction-output-card">
          {analyzing ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3" id="extractor-running-screen">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-xs text-indigo-400 font-mono">Running scientific entity tokenizers...</p>
            </div>
          ) : extractedResult ? (
            <div className="space-y-5 h-full overflow-y-auto pr-1" id="analyzed-document-card">
              <div className="flex items-center justify-between border-b border-gray-850 pb-3" id="analyzed-headline">
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900 font-bold">ANALYZED</span>
                <span className="text-[10px] font-mono text-gray-500">ID: {extractedResult.id}</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white font-sans">{extractedResult.title}</h3>
                <p className="text-[10px] text-gray-500 font-mono">Journal: {extractedResult.journal} ({extractedResult.year}) • Authors: {extractedResult.authors}</p>
              </div>

              {/* Targets and chemical complexes identified */}
              <div className="grid grid-cols-2 gap-3" id="extracted-entities-grid">
                <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-850 space-y-1.5" id="extracted-targets-pill">
                  <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider block font-semibold">Targets Identified</span>
                  <div className="flex flex-wrap gap-1" id="targets-list">
                    {extractedResult.extractedTargets?.map((tgt, idx) => (
                      <span key={idx} className="bg-gray-950 border border-gray-800 px-2 py-0.5 rounded text-[10px] font-mono text-gray-300 font-medium">{tgt}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-850 space-y-1.5" id="extracted-molecules-pill">
                  <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block font-semibold">Compounds Identified</span>
                  <div className="flex flex-wrap gap-1" id="molecules-list">
                    {extractedResult.extractedMolecules?.map((mol, idx) => (
                      <span key={idx} className="bg-gray-950 border border-gray-800 px-2 py-0.5 rounded text-[10px] font-mono text-gray-300 font-medium">{mol}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Extracted therapeutic findings */}
              <div className="bg-gray-900/35 p-4 rounded-xl border border-gray-850 space-y-1.5" id="manuscript-findings-box">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">Extracted Bio-Findings Summary</span>
                <p className="text-[11px] text-gray-300 leading-relaxed font-sans">{extractedResult.therapeuticFindings}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3" id="extraction-billboard-empty">
              <FileText className="w-10 h-10 text-indigo-950/60" />
              <div className="max-w-xs space-y-1">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Literature Output Desk</h4>
                <p className="text-[10px] text-gray-500 font-sans leading-normal">
                  Copy journal abstracts to extract proteins, therapeutic chemicals, and findings instantly.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Indexed Publication References Desk */}
      <section className="bg-gray-950/60 border border-gray-800 rounded-2xl p-5 space-y-4" id="manuscripts-registry-card">
        <div className="flex items-center gap-2 border-b border-gray-850 pb-3" id="indexed-catalog-header">
          <BookOpen className="w-4.5 h-4.5 text-indigo-405" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200">Indexed Publication references</h3>
        </div>

        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1" id="manuscript-items-piles">
          {papers.map((paper) => (
            <div key={paper.id} className="bg-gray-900/30 p-3.5 rounded-xl border border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-4" id={`indexed-item-${paper.id}`}>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white font-sans">{paper.title}</h4>
                <p className="text-[10px] text-gray-500 font-sans italic">{paper.authors} • {paper.journal} ({paper.year})</p>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] font-mono bg-gray-950 px-2 py-1.5 rounded border border-gray-850/65" id={`indexed-details-${paper.id}`}>
                <span className="text-gray-400">Targets: <span className="text-emerald-400 font-bold">{paper.extractedTargets?.join(", ") || "None"}</span></span>
                <span className="text-gray-500">|</span>
                <span className="text-gray-400">Compounds: <span className="text-indigo-400 font-bold">{paper.extractedMolecules?.join(", ") || "None"}</span></span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
