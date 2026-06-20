export interface MoleculeCandidate {
  id: string;
  name: string;
  chemicalName: string;
  formula: string;
  smiles: string;
  molecularWeight: number;
  bindingAffinity: number;
  confidence: number;
  toxicity: {
    liver: "Low" | "Moderate" | "High";
    cardio: "Low" | "Moderate" | "High";
    mutagenic: "Safe" | "Mutagenic";
    sideEffects: string[];
  };
  logP: number;
  lipinskiRule: boolean;
  dockingPoseScore: number;
  description: string;
  mechanism: string;
  timestamp: string;
  tags?: string[];
}

export interface SelectedTarget {
  pdbId: string;
  name: string;
  resolution: string;
  organism: string;
  description: string;
  sequence: string;
  activeSites: { residue: string; position: number; role: string }[];
  pockets: { name: string; volume: string; druggability: number }[];
  atomsCount: number;
}

export interface ResearchPaper {
  id: string;
  title: string;
  journal: string;
  authors: string;
  year: number;
  extractedTargets: string[];
  extractedMolecules: string[];
  therapeuticFindings: string;
  timestamp: string;
}

export interface GPUMetrics {
  gpuId: string;
  name: string;
  utilization: number;
  vramUsed: number;
  vramTotal: number;
  temp: number;
  power: number;
  activeTask: string | null;
  isPaused?: boolean;
}

export interface ExperimentJob {
  id: string;
  name: string;
  target: string;
  type: "Molecular Docking" | "QSAR Affinity" | "ESM2 Secondary Structure" | "ChemBERTa Toxicity" | "Generative Diffusion";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  gpuId: string;
  epoch?: number;
  metrics?: { loss?: number; accuracy?: number; r2?: number };
  logs: string[];
  outputData?: any;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ParsedAtom {
  id?: number;
  name?: string;
  resName?: string;
  chainId?: string;
  resSeq?: number;
  x: number;
  y: number;
  z: number;
  element: string;
}

export interface ParsedBond {
  from: number;
  to: number;
  order: number;
}
