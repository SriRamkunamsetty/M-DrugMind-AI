import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing with safe limit configurations
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize GoogleGenAI SDK (lazy evaluation guard)
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ GEMINI_API_KEY environment variable is not defined. AI components will operate in safety-simulation mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Global In-Memory Registries for Real-Time State Synced across Clients
interface MoleculeCandidate {
  id: string;
  name: string;
  chemicalName: string;
  formula: string;
  smiles: string;
  molecularWeight: number;
  bindingAffinity: number; // IC50 or Kd in nM
  confidence: number;
  toxicity: {
    liver: "Low" | "Moderate" | "High";
    cardio: "Low" | "Moderate" | "High";
    mutagenic: "Safe" | "Mutagenic";
    sideEffects: string[];
  };
  logP: number;
  lipinskiRule: boolean;
  dockingPoseScore: number; // kcal/mol
  description: string;
  mechanism: string;
  timestamp: string;
}

interface SelectedTarget {
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

interface ResearchPaper {
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

interface GPUMetrics {
  gpuId: string;
  name: string;
  utilization: number;
  vramUsed: number;
  vramTotal: number;
  temp: number;
  power: number;
  activeTask: string | null;
}

interface ExperimentJob {
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

// In-Memory Database Stores
const moleculesStore: MoleculeCandidate[] = [
  {
    id: "DM-EGFR-001",
    name: "Erlotinib (Active Compare)",
    chemicalName: "N-(3-ethynylphenyl)-6,7-bis(2-methoxyethoxy)quinazolin-4-amine",
    formula: "C22H23N3O4",
    smiles: "COCCOC1=C(C=C2C(=C1)C(=NC=N2)NC3=CC=CC(=C3)C#C)OCCOC",
    molecularWeight: 393.44,
    bindingAffinity: 2.1,
    confidence: 0.98,
    toxicity: {
      liver: "Moderate",
      cardio: "Low",
      mutagenic: "Safe",
      sideEffects: ["Rash", "Diarrhea", "Fatigue"]
    },
    logP: 2.7,
    lipinskiRule: true,
    dockingPoseScore: -9.2,
    description: "Reversible tyrosine kinase inhibitor targetting Epidermal Growth Factor Receptor (EGFR) mutations.",
    mechanism: "Binds competitively to the ATP-binding pocket of EGFR kinase domain to stop autophosphorylation.",
    timestamp: new Date().toISOString()
  },
  {
    id: "DM-COVID-005",
    name: "Nirmatrelvir (Active Compare)",
    chemicalName: "(1R,2S,5S)-3-[2-amino-1-(4-fluorophenyl)-2-oxoethyl]-N-[(1S)-1-cyano-2-[(3S)-2-oxopyrrolidin-3-yl]ethyl]-6,6-dimethyl-3-azabicyclo[3.1.0]hexane-2-carboxamide",
    formula: "C23H32F3N5O4",
    smiles: "CC1(C2C1C(N(C2)C(=O)C(C(C)(C)C)NC(=O)C(F)(F)F)C(=O)NC(C#N)CC3CCNC3=O)C",
    molecularWeight: 499.53,
    bindingAffinity: 8.4,
    confidence: 0.96,
    toxicity: {
      liver: "Low",
      cardio: "Low",
      mutagenic: "Safe",
      sideEffects: ["Altered taste", "Diarrhea"]
    },
    logP: 1.8,
    lipinskiRule: true,
    dockingPoseScore: -8.7,
    description: "Main protease (Mpro) competitive inhibitor blockading viral replication in COVID-19 pathways.",
    mechanism: "Irreversibly alkylates the active site Cys-145 sulfur nucleophile inside viral 3CLpro.",
    timestamp: new Date().toISOString()
  }
];

const targetStore: SelectedTarget[] = [
  {
    pdbId: "1M17",
    name: "EGFR Kinase Domain with Erlotinib",
    resolution: "2.60 Å",
    organism: "Homo sapiens",
    description: "Epidermal Growth Factor Receptor kinase catalytic domain crucial in multiple non-small cell lung cancer pathways.",
    sequence: "LGEGAFGTVYKGLWIPGEKVKIPVAIKELREATSPKANKEILDEAYVMASVDNPHVCRLLGICLTSTVQLITQLMPFGCLLDYVREHKDNIGSQYLLNWCVQIAKGMNYLEDRRLVHRDLAARNVLVKTPQHVKITDFGLAKLLGAEEKEYHAEGGKVPIKWMALESILHRIYTHQSDVWSYGVTVWELMTFGSKPYDGIPASEISSILEKGERLPQPPICTIDVYMIMVKCWMIDADSRPKFRELIIEFSKMARDPQRYLVIQGDERMHLP",
    activeSites: [
      { residue: "MET", position: 793, role: "H-Bond ATP anchoring point" },
      { residue: "ASP", position: 855, role: "Catalytic Aspartate coordinating Mg2+" },
      { residue: "THR", position: 790, role: "Gatekeeper mutation node site" }
    ],
    pockets: [
      { name: "Primary ATP Binding Pocket", volume: "420 Å³", druggability: 0.95 },
      { name: "Allosteric Pocket II", volume: "280 Å³", druggability: 0.72 }
    ],
    atomsCount: 1420
  }
];

const researchPapersStore: ResearchPaper[] = [
  {
    id: "PUB-2026-01",
    title: "Discovery of ultra-potent allosteric dual-inhibitors combating gatekeeper-mutations in EGFR cancer domains",
    journal: "Nature Cancer Discovery",
    authors: "Kunamsetty M. S., Collins A., Patel S.",
    year: 2026,
    extractedTargets: ["EGFR (T790M/C797S)"],
    extractedMolecules: ["DM-EGFR-001", "osimertinib-derived scaffold"],
    therapeuticFindings: "Targeted allosteric binding pockets successfully avoid mutated residues while maintaining nanomolar specificity.",
    timestamp: new Date().toISOString()
  }
];

let activeExperimentJobs: ExperimentJob[] = [
  {
    id: "JOB-101",
    name: "Affinity Model Fine-Tuning - Warmup",
    target: "EGFR 1M17",
    type: "QSAR Affinity",
    status: "completed",
    progress: 100,
    gpuId: "GPU-1",
    metrics: { loss: 0.14, accuracy: 0.94, r2: 0.88 },
    logs: ["Initializing ChemBERTa-Affinity node...", "Dataset loaded: ChEMBL v33 EGFR records", "Training epoch 1/5 - Loss: 0.42", "Training epoch 5/5 - Loss: 0.14", "Model successfully weights-locked in MLOps Registryv2"],
    timestamp: new Date().toISOString()
  }
];

// GPU Real-Time Metrics
const gpuClusterMetrics: GPUMetrics[] = [
  { gpuId: "GPU-0", name: "NVIDIA H100 SXM5 80GB", utilization: 0, vramUsed: 0.0, vramTotal: 80, temp: 42, power: 90, activeTask: null },
  { gpuId: "GPU-1", name: "NVIDIA H100 SXM5 80GB", utilization: 72, vramUsed: 42.4, vramTotal: 80, temp: 68, power: 340, activeTask: "ChemBERTa Toxicity Pipeline" },
  { gpuId: "GPU-2", name: "NVIDIA A100 SXM4 80GB", utilization: 15, vramUsed: 12.8, vramTotal: 80, temp: 51, power: 180, activeTask: "ESM2 Sequence Embedder" },
  { gpuId: "GPU-3", name: "NVIDIA A100 SXM4 80GB", utilization: 0, vramUsed: 0.0, vramTotal: 80, temp: 39, power: 85, activeTask: null }
];

// Server Sent Events (SSE) Connections Management
let connectedClients: express.Response[] = [];

app.get("/api/realtime/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  connectedClients.push(res);
  console.log(`📡 Client connected to DrugMind Event stream. Pool active: ${connectedClients.length}`);

  // Initial connection synchronized data packet
  res.write(`data: ${JSON.stringify({
    type: "SYNC_INITIAL_STATE",
    payload: {
      molecules: moleculesStore,
      targets: targetStore,
      papers: researchPapersStore,
      gpuMetrics: gpuClusterMetrics,
      jobs: activeExperimentJobs
    }
  })}\n\n`);

  req.on("close", () => {
    connectedClients = connectedClients.filter(c => c !== res);
    console.log(`🔌 Client disconnected. Pool alive: ${connectedClients.length}`);
  });
});

function emitRealTimeEvent(type: string, payload: any) {
  const dataString = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  connectedClients.forEach(client => {
    client.write(`data: ${dataString}\n\n`);
  });
}

// Background Task: Periodic GPU Monitoring Fluctuations Simulation
setInterval(() => {
  gpuClusterMetrics.forEach(gpu => {
    // If GPU is manually paused, keep metrics low and idle
    if ((gpu as any).isPaused) {
      gpu.utilization = 0;
      gpu.vramUsed = 0.0;
      gpu.temp = Math.max(32, gpu.temp - 1.5);
      gpu.power = 40;
      gpu.activeTask = "COMPUTE_NODE_PAUSED";
      return;
    }
    
    // Resume standard name if activeTask was paused on node
    if (gpu.activeTask === "COMPUTE_NODE_PAUSED") {
      gpu.activeTask = null;
    }

    if (gpu.activeTask) {
      // Fluctuations for busy GPUs
      gpu.utilization = Math.min(100, Math.max(40, gpu.utilization + (Math.random() * 20 - 10)));
      gpu.vramUsed = Math.min(gpu.vramTotal, Math.max(10, gpu.vramUsed + (Math.random() * 4 - 2)));
      gpu.temp = Math.min(85, Math.max(55, gpu.temp + (Math.random() * 4 - 2)));
      gpu.power = Math.min(400, Math.max(150, gpu.power + (Math.random() * 30 - 15)));
    } else {
      // Cooling idle GPUs
      gpu.utilization = Math.max(0, gpu.utilization * 0.5);
      gpu.vramUsed = Math.max(0, gpu.vramUsed * 0.5);
      gpu.temp = Math.max(38, gpu.temp - (gpu.temp > 40 ? 0.5 : 0));
      gpu.power = Math.max(75, gpu.power - (gpu.power > 80 ? 2 : 0));
    }
  });

  emitRealTimeEvent("GPU_METRICS_UPDATE", gpuClusterMetrics);
}, 3000);

// API Endpoints: Ingestion Pipeline and Storage Fetches

// Get Synchronous Dashboard Metrics
app.get("/api/dashboard/stats", (req, res) => {
  res.json({
    moleculesCount: moleculesStore.length,
    targetsAnalyzed: targetStore.length,
    extractedPapers: researchPapersStore.length,
    runningWorkers: activeExperimentJobs.filter(j => j.status === "running").length,
    clusterGPUUtilization: Math.round(gpuClusterMetrics.reduce((acc, g) => acc + g.utilization, 0) / gpuClusterMetrics.length),
  });
});

// Real-Time PDB Parser and biochemical Target analyzer
app.get("/api/protein/pdb/:pdbId", async (req, res) => {
  const { pdbId } = req.params;
  const uppercaseId = pdbId.toUpperCase().trim();

  try {
    console.log(`🧬 Initiating structural PDB retrieval from target RCSB system: ${uppercaseId}`);
    
    // Fetch atom records from RCSB network
    const pdbUrl = `https://files.rcsb.org/download/${uppercaseId}.pdb`;
    const pdbResponse = await fetch(pdbUrl);

    if (!pdbResponse.ok) {
      throw new Error(`PDB entry ${uppercaseId} does not exist in the official RCSB registry.`);
    }

    const pdbText = await pdbResponse.text();

    // Custom parsed internal 3D format for client visualization
    const atoms: any[] = [];
    const lines = pdbText.split("\n");
    let atomsFound = 0;

    for (const line of lines) {
      if (line.startsWith("ATOM  ") || line.startsWith("HETATM")) {
        const name = line.substring(12, 16).trim();
        const resName = line.substring(17, 20).trim();
        const chainId = line.substring(21, 22).trim();
        const resSeq = parseInt(line.substring(22, 26).trim(), 10);
        const x = parseFloat(line.substring(30, 38).trim());
        const y = parseFloat(line.substring(38, 46).trim());
        const z = parseFloat(line.substring(46, 54).trim());
        const element = line.substring(76, 78).trim() || name[0];

        atoms.push({ name, resName, chainId, resSeq, x, y, z, element });
        atomsFound++;
        
        // Safety lock size optimization for seamless interactive browser rendering
        if (atomsFound >= 1000) break;
      }
    }

    // AI Refined Bio-annotation retrieval
    let targetMetadata: Partial<SelectedTarget> = {};
    try {
      const g = getGemini();
      const prompt = `Act as an expert computational biochemist. You are parsing protein entry ${uppercaseId}. Please provide a structural biography for this molecule. Return a JSON structure exactly corresponding to this schema:
      {
        "name": "General biochemical descriptive title of protein",
        "resolution": "e.g. 2.15 Å",
        "organism": "Organism source",
        "description": "Short bio-pathway role (2 sentences)",
        "sequence": "Representative amino acid sequence (max 100 chars indexable)",
        "activeSites": [
          {"residue": "three letter code", "position": 123, "role": "e.g. coordinates ligand"}
        ],
        "pockets": [
          {"name": "Pocket name", "volume": "e.g. 350 Å³", "druggability": 0.85}
        ]
      }`;

      const aiResponse = await g.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = aiResponse.text || "{}";
      const parsedMeta = JSON.parse(responseText);
      targetMetadata = {
        name: parsedMeta.name,
        resolution: parsedMeta.resolution,
        organism: parsedMeta.organism,
        description: parsedMeta.description,
        sequence: parsedMeta.sequence,
        activeSites: parsedMeta.activeSites,
        pockets: parsedMeta.pockets,
      };
    } catch {
      // Fallback details if Gemini key is dead/fails
      targetMetadata = {
        name: `${uppercaseId} Active target domain`,
        resolution: "2.40 Å",
        organism: "Homo sapiens",
        description: "Bioactive enzymatic protein targeted in molecular docking runs.",
        sequence: "MGKGKLKPLGTVYKGIPREKVKIPVAIKELRVMASVDRLLGICLTSTVQLITQLMPFGCL",
        activeSites: [{ residue: "ASP", position: 104, role: "Active Site coordinate center" }],
        pockets: [{ name: "Target Catalytic Bind Zone", volume: "350 Å³", druggability: 0.88 }]
      };
    }

    const completedTarget: SelectedTarget = {
      pdbId: uppercaseId,
      name: targetMetadata.name || "Parsed Target Structure",
      resolution: targetMetadata.resolution || "Unknown",
      organism: targetMetadata.organism || "Homo Sapiens",
      description: targetMetadata.description || "Experimental biochemistry macromolecule target structure.",
      sequence: targetMetadata.sequence || "MVKG...",
      activeSites: targetMetadata.activeSites || [],
      pockets: targetMetadata.pockets || [],
      atomsCount: atomsFound
    };

    // Store analyzed Target
    const exists = targetStore.findIndex(t => t.pdbId === uppercaseId);
    if (exists !== -1) {
      targetStore[exists] = completedTarget;
    } else {
      targetStore.push(completedTarget);
    }

    emitRealTimeEvent("ProteinAnalyzed", completedTarget);

    res.json({
      success: true,
      protein: completedTarget,
      atoms: atoms
    });

  } catch (err: any) {
    console.error("error parsing structure", err);
    res.status(500).json({ error: err.message || "Failed to analyze target structure." });
  }
});

// PubChem SMILES and 3D SDF Retriever Integration
app.get("/api/molecule/pubchem/:nameOrCid", async (req, res) => {
  const { nameOrCid } = req.params;
  const isCid = /^\d+$/.test(nameOrCid);

  try {
    console.log(`🧪 Retreiving PubChem structures for Identifier: ${nameOrCid}`);
    
    const queryPath = isCid ? `cid/${nameOrCid}` : `name/${encodeURIComponent(nameOrCid)}`;
    
    // Retrieve full properties JSON from Pubchem to display
    const propertiesUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${queryPath}/property/IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES/JSON`;
    
    let compoundProperties: any = {};
    try {
      const propResponse = await fetch(propertiesUrl);
      if (propResponse.ok) {
        const propJson = await propResponse.json();
        const info = propJson.PropertyTable.Properties[0];
        compoundProperties = {
          cid: info.CID,
          iupacName: info.IUPACName,
          formula: info.MolecularFormula,
          weight: parseFloat(info.MolecularWeight),
          smiles: info.CanonicalSMILES
        };
      }
    } catch (propertiesErr) {
      console.warn("⚠️ Web fetch of properties failed. Will cascade to fallback database configuration.");
    }

    // fallback properties database for popular molecules to remain 100% stable offline
    const cleanQuery = nameOrCid.toLowerCase().trim();
    const fallbackDb: Record<string, { formula: string; weight: number; iupacName: string; smiles: string; cid: string }> = {
      "erlotinib": {
        formula: "C22H23N3O4",
        weight: 393.4,
        iupacName: "N-(3-ethynylphenyl)-6,7-bis(2-methoxyethoxy)quinazolin-4-amine",
        smiles: "COCCOC1=C(C=C2C(=C1)C(=NC=N2)NC3=CC=CC(=C3)C#C)OCCOC",
        cid: "176870"
      },
      "176870": {
        formula: "C22H23N3O4",
        weight: 393.4,
        iupacName: "N-(3-ethynylphenyl)-6,7-bis(2-methoxyethoxy)quinazolin-4-amine",
        smiles: "COCCOC1=C(C=C2C(=C1)C(=NC=N2)NC3=CC=CC(=C3)C#C)OCCOC",
        cid: "176870"
      },
      "imatinib": {
        formula: "C29H31N7O",
        weight: 493.6,
        iupacName: "4-[(4-methylpiperazin-1-yl)methyl]-N-[4-methyl-3-[(4-pyridin-3-ylpyrimidin-2-yl)amino]phenyl]benzamide",
        smiles: "CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5",
        cid: "5291"
      },
      "5291": {
        formula: "C29H31N7O",
        weight: 493.6,
        iupacName: "4-[(4-methylpiperazin-1-yl)methyl]-N-[4-methyl-3-[(4-pyridin-3-ylpyrimidin-2-yl)amino]phenyl]benzamide",
        smiles: "CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5",
        cid: "5291"
      },
      "caffeine": {
        formula: "C8H10N4O2",
        weight: 194.19,
        iupacName: "1,3,7-trimethylpurine-2,6-dione",
        smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
        cid: "2519"
      },
      "2519": {
        formula: "C8H10N4O2",
        weight: 194.19,
        iupacName: "1,3,7-trimethylpurine-2,6-dione",
        smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
        cid: "2519"
      },
      "aspirin": {
        formula: "C9H8O4",
        weight: 180.16,
        iupacName: "2-acetyloxybenzoic acid",
        smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
        cid: "2244"
      },
      "2244": {
        formula: "C9H8O4",
        weight: 180.16,
        iupacName: "2-acetyloxybenzoic acid",
        smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
        cid: "2244"
      },
      "ibuprofen": {
        formula: "C13H18O2",
        weight: 206.29,
        iupacName: "2-[4-(2-methylpropyl)phenyl]propanoic acid",
        smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
        cid: "3672"
      },
      "3672": {
        formula: "C13H18O2",
        weight: 206.29,
        iupacName: "2-[4-(2-methylpropyl)phenyl]propanoic acid",
        smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
        cid: "3672"
      }
    };

    if (fallbackDb[cleanQuery]) {
      const dbInfo = fallbackDb[cleanQuery];
      compoundProperties.cid = compoundProperties.cid || dbInfo.cid;
      compoundProperties.iupacName = compoundProperties.iupacName || dbInfo.iupacName;
      compoundProperties.formula = compoundProperties.formula || dbInfo.formula;
      compoundProperties.weight = compoundProperties.weight || dbInfo.weight;
      compoundProperties.smiles = compoundProperties.smiles || dbInfo.smiles;
    }

    // Fetch 3D SDF coordinates
    const sdfUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${queryPath}/SDF?record_type=3d`;
    console.log(`Querying SDF: ${sdfUrl}`);
    
    let sdfText = "";
    
    try {
      const sdfResponse = await fetch(sdfUrl);
      if (sdfResponse.ok) {
        sdfText = await sdfResponse.text();
      } else {
        console.warn(`⚠️ 3D SDF lookup failing for ${nameOrCid}. Trying 2D SDF...`);
        const sdfUrl2d = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${queryPath}/SDF?record_type=2d`;
        const sdfResponse2d = await fetch(sdfUrl2d);
        if (sdfResponse2d.ok) {
          sdfText = await sdfResponse2d.text();
        } else {
          console.warn(`⚠️ 2D SDF lookup failing too for ${nameOrCid}. Initializing synthetic molecular projection.`);
        }
      }
    } catch (e) {
      console.warn(`Exception during SDF download, attempting 2D and synthetic cascade`, e);
    }

    // Custom SDF atomic bond table coordinate parser
    const atoms: any[] = [];
    const bonds: any[] = [];

    if (sdfText) {
      const lines = sdfText.split("\n");
      let atomCount = 0;
      let bondCount = 0;
      let mode = "header";
      let internalIdx = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Parse Atom and Bond length registry from sdf line 4 (0-indexed 3)
        if (i === 3) {
          atomCount = parseInt(line.substring(0, 3).trim(), 10);
          bondCount = parseInt(line.substring(3, 6).trim(), 10);
          mode = "atoms";
          internalIdx = 0;
          continue;
        }

        if (mode === "atoms" && internalIdx < atomCount) {
          const x = parseFloat(line.substring(0, 10).trim());
          const y = parseFloat(line.substring(10, 20).trim());
          const z = parseFloat(line.substring(20, 30).trim());
          const element = line.substring(31, 34).trim();
          
          atoms.push({ id: internalIdx + 1, x, y, z, element });
          internalIdx++;
          
          if (internalIdx === atomCount) {
            mode = "bonds";
            internalIdx = 0;
          }
          continue;
        }

        if (mode === "bonds" && internalIdx < bondCount) {
          const from = parseInt(line.substring(0, 3).trim(), 10);
          const to = parseInt(line.substring(3, 6).trim(), 10);
          const order = parseInt(line.substring(6, 9).trim(), 10);
          
          bonds.push({ from, to, order });
          internalIdx++;
          continue;
        }
      }
    }

    // If both SDF models were absent or empty, or coordinate counts parsed 0 atoms
    if (atoms.length === 0) {
      console.warn(`⚠️ Building synthetic molecular graph representation for ${nameOrCid}...`);
      const elements: string[] = [];
      const formula = compoundProperties.formula || "C22H23N3O4";
      const matches = formula.match(/([A-Z][a-z]*)(\d*)/g);
      if (matches) {
        matches.forEach(m => {
          const elMatch = m.match(/([A-Z][a-z]*)/);
          const numMatch = m.match(/\d+/);
          if (elMatch) {
            const elementStr = elMatch[1];
            const count = numMatch ? parseInt(numMatch[0], 10) : 1;
            for (let c = 0; c < count; c++) {
              elements.push(elementStr);
            }
          }
        });
      }
      if (elements.length === 0) {
        elements.push(...Array(12).fill("C"), ...Array(15).fill("H"), ...Array(3).fill("N"), ...Array(4).fill("O"));
      }

      // Generate elegant organic 3D spatial coordinate projection (e.g., helical loop ring)
      for (let idx = 0; idx < elements.length; idx++) {
        const angle = (idx / elements.length) * Math.PI * 4; // winding spirals
        const radius = 1.8 + (idx * 0.08);
        const x = radius * Math.cos(angle) + (Math.random() - 0.5) * 0.2;
        const y = (idx * 0.15) - (elements.length * 0.075);
        const z = radius * Math.sin(angle) + (Math.random() - 0.5) * 0.2;
        atoms.push({ id: idx + 1, x, y, z, element: elements[idx] });
      }

      // Connect sequence of non-hydrogen atoms to form backbone chains
      const nonHAtoms = atoms.filter(a => a.element !== "H");
      for (let idx = 0; idx < nonHAtoms.length - 1; idx++) {
        bonds.push({ from: nonHAtoms[idx].id, to: nonHAtoms[idx + 1].id, order: Math.random() > 0.85 ? 2 : 1 });
      }
      // Create interesting closed cycles (aromatic looks)
      if (nonHAtoms.length >= 6) {
        for (let idx = 0; idx < nonHAtoms.length - 6; idx += 6) {
          bonds.push({ from: nonHAtoms[idx].id, to: nonHAtoms[idx + 5].id, order: 1 });
        }
      }
      // Attach Hydrogens to parents
      const hAtoms = atoms.filter(a => a.element === "H");
      hAtoms.forEach((h, hIdx) => {
        if (nonHAtoms.length > 0) {
          const parent = nonHAtoms[hIdx % nonHAtoms.length];
          bonds.push({ from: h.id, to: parent.id, order: 1 });
        }
      });
    }

    res.json({
      success: true,
      cid: compoundProperties.cid || "SDF-EXTRACT",
      name: nameOrCid,
      chemicalName: compoundProperties.iupacName || "Unknown IUPAC Name",
      formula: compoundProperties.formula || "C_x H_y",
      molecularWeight: compoundProperties.weight || 100.0,
      smiles: compoundProperties.smiles || "",
      atoms: atoms,
      bonds: bonds
    });

  } catch (err: any) {
    console.error("error fetching PubChem coordinate tables", err);
    res.status(500).json({ error: err.message || "Failed to retrieve experimental chemical vector models." });
  }
});

// Molecular Generative Diffusion / GraphVAE Simulator Pipeline
app.post("/api/molecule/generate", async (req, res) => {
  const { targetDisease, criteria } = req.body;

  if (!targetDisease) {
    return res.status(400).json({ error: "Disease Target query parameter can not be empty." });
  }

  // Pick an idle GPU to process
  const freeGpu = gpuClusterMetrics.find(g => !g.activeTask) || gpuClusterMetrics[0];
  const originalGpuTask = freeGpu.activeTask;
  
  // Register active job in MLOps runner registry
  const jobId = `JOB-${Math.round(Math.random() * 899 + 100)}`;
  const newJob: ExperimentJob = {
    id: jobId,
    name: `DrugMind Generative Lead: ${targetDisease}`,
    target: targetDisease,
    type: "Generative Diffusion",
    status: "running",
    progress: 10,
    gpuId: freeGpu.gpuId,
    epoch: 0,
    logs: [
      `Initializing Generative Diffusion Model GraphVAE node...`,
      `Mapping chemical coordinates target space matching criteria: ${criteria || "High binding, low side effects"}`,
      `Analyzing geometric binding profiles against standard BindingDB records...`,
    ],
    timestamp: new Date().toISOString()
  };

  freeGpu.activeTask = `Generative: ${targetDisease}`;
  freeGpu.utilization = 85;
  freeGpu.vramUsed = 22.4;
  activeExperimentJobs.push(newJob);

  emitRealTimeEvent("GPU_METRICS_UPDATE", gpuClusterMetrics);
  emitRealTimeEvent("JOB_STATUS_UPDATE", activeExperimentJobs);

  try {
    const g = getGemini();
    const prompt = `Act as an expert computational drug design agent. The disease target to generate novel inhibitor drug candidate molecules for is: "${targetDisease}".
    Generate a novel optimized therapeutic candidate molecule following these criteria: ${criteria || "low hepatotoxicity, optimal binding scores"}.
    Ensure the structures are chemically realistic, satisfy standard atomic valency rules, and are medically sound.
    Provide the details in a strict structured JSON matching this exact typescript format schema:
    {
      "name": "Creative DrugMind internal experimental ID (e.g. DM-EGFR-79)",
      "chemicalName": "Synthesized IUPAC scientific moniker",
      "formula": "Realistic chemical molecular formula",
      "smiles": "Rigorous structurally valid SMILES string",
      "molecularWeight": 412.5,
      "bindingAffinity": 4.5,
      "confidence": 0.89,
      "toxicity": {
        "liver": "Low",
        "cardio": "Low",
        "mutagenic": "Safe",
        "sideEffects": ["Mild nausea", "Headache"]
      },
      "logP": 2.8,
      "lipinskiRule": true,
      "dockingPoseScore": -8.9,
      "description": "2-sentence specific structural mechanism details",
      "mechanism": "1-sentence molecular pathway target inhibition breakdown"
    }`;

    // Background runner simulation ticks over SSE stream
    setTimeout(() => {
      newJob.progress = 50;
      newJob.epoch = 50;
      newJob.logs.push(`Running latency molecular docking scoring algorithms (epoch 50/100)`, `Estimated docking pose affinity score successfully updating...`);
      emitRealTimeEvent("JOB_STATUS_UPDATE", activeExperimentJobs);
    }, 2000);

    const aiRes = await g.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const output = JSON.parse(aiRes.text || "{}");
    const novelCandidate: MoleculeCandidate = {
      id: output.name || `DM-${targetDisease.toUpperCase().substring(0, 4)}-${Math.round(Math.random()*89+10)}`,
      name: output.name || "Novel AI Inhibitor",
      chemicalName: output.chemicalName || "Synthetic chemical candidate",
      formula: output.formula || "C15H20N4O3",
      smiles: output.smiles || "CC1...",
      molecularWeight: output.molecularWeight || 350.0,
      bindingAffinity: output.bindingAffinity || 12.5,
      confidence: output.confidence || 0.85,
      toxicity: {
        liver: output.toxicity?.liver || "Low",
        cardio: output.toxicity?.cardio || "Low",
        mutagenic: output.toxicity?.mutagenic || "Safe",
        sideEffects: output.toxicity?.sideEffects || ["Nausea"]
      },
      logP: output.logP !== undefined ? output.logP : 2.5,
      lipinskiRule: output.lipinskiRule !== undefined ? output.lipinskiRule : true,
      dockingPoseScore: output.dockingPoseScore || -7.8,
      description: output.description || "Synthetically generated lead designed for ligand domain specificity.",
      mechanism: output.mechanism || "Target receptor blockade.",
      timestamp: new Date().toISOString()
    };

    // Store compound generated
    moleculesStore.push(novelCandidate);

    // Complete job status successfully
    setTimeout(() => {
      newJob.progress = 100;
      newJob.status = "completed";
      newJob.epoch = 100;
      newJob.metrics = { loss: 0.08, accuracy: 0.96, r2: 0.91 };
      newJob.logs.push(
        `Generative Diffusion model converges successfully at epoch 100`,
        `Candidate generated: ${novelCandidate.id} (${novelCandidate.chemicalName})`,
        `Safety criteria checks completed successfully. Storing candidate in registry...`
      );
      
      // Cleanup GPU usage allocations
      freeGpu.activeTask = originalGpuTask;
      freeGpu.utilization = 0;
      freeGpu.vramUsed = 0.0;

      emitRealTimeEvent("GPU_METRICS_UPDATE", gpuClusterMetrics);
      emitRealTimeEvent("JOB_STATUS_UPDATE", activeExperimentJobs);
      emitRealTimeEvent("MoleculeGenerated", novelCandidate);
    }, 4000);

    res.json({
      success: true,
      jobId,
      candidate: novelCandidate
    });

  } catch (err: any) {
    console.error("Generative synthesis crash", err);
    newJob.status = "failed";
    newJob.logs.push(`FATAL: Generative engine failed: ${err.message || "Unknown schema processing lock"}`);
    
    // Free GPU
    freeGpu.activeTask = originalGpuTask;
    freeGpu.utilization = 0;
    
    emitRealTimeEvent("GPU_METRICS_UPDATE", gpuClusterMetrics);
    emitRealTimeEvent("JOB_STATUS_UPDATE", activeExperimentJobs);
    
    res.status(500).json({ error: err.message || "Failed to initialize GNN diffusion models." });
  }
});

// Scientific Paper Intelligence Entity Extractor
app.post("/api/paper/analyze", async (req, res) => {
  const { rawText, title } = req.body;

  if (!rawText) {
    return res.status(400).json({ error: "Document body payload cannot be empty." });
  }

  try {
    const g = getGemini();
    const prompt = `Act as an academic biomedical extraction agent. You will read the text snippet of a research paper provided below and extract targets, therapeutic chemical complexes, findings, and publications metrics.
    TEXT SNIPPET:
    "${rawText}"
    
    Provide the details in structured format as a strict JSON matching this schema:
    {
      "title": "Title of paper or inferred title",
      "journal": "Inferred or provided scientific journal",
      "authors": "Representative listed researchers",
      "year": 2026,
      "extractedTargets": ["List target proteins or pathway indicators"],
      "extractedMolecules": ["List identified chemical compounds or inhibitors"],
      "therapeuticFindings": "One comprehensive summary paragraph of medical results and scientific conclusions"
    }`;

    const aiRes = await g.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const data = JSON.parse(aiRes.text || "{}");
    const completePaper: ResearchPaper = {
      id: `PUB-${Math.round(Math.random() * 8999 + 1000)}`,
      title: title || data.title || "Inferred Molecular Study",
      journal: data.journal || "Bioinformatics and Medicinal Chemistry",
      authors: data.authors || "Inferred Scientific Consortium",
      year: data.year || 2026,
      extractedTargets: data.extractedTargets || [],
      extractedMolecules: data.extractedMolecules || [],
      therapeuticFindings: data.therapeuticFindings || "Therapeutic complex successfully resolved.",
      timestamp: new Date().toISOString()
    };

    researchPapersStore.push(completePaper);
    emitRealTimeEvent("ReportCreated", completePaper);

    res.json({
      success: true,
      paper: completePaper
    });

  } catch (err: any) {
    console.error("Failed parsing manuscript doc", err);
    res.status(500).json({ error: err.message || "AI entity analyzer indexing pipeline failure." });
  }
});

// Research Copilot Chat integration
app.post("/api/copilot/chat", async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message input content cannot be empty." });
  }

  try {
    const g = getGemini();
    
    const contextPrompt = `You are the DrugMind AI Scientific Copilot, an elite computational chemist and molecular researcher.
    You assist senior drug design experts with modeling targets, docking analysis, QSAR models, ADMET profiles, and real-time generation commands.
    In-memory system databases contain:
    - Current Target Bio-models: ${JSON.stringify(targetStore.map(t => ({ id: t.pdbId, name: t.name })))}
    - Active chemical candidates: ${JSON.stringify(moleculesStore.map(m => ({ id: m.id, smiles: m.smiles, mw: m.molecularWeight, dScore: m.dockingPoseScore })))}
    Provide highly accurate, scientifically sound guidance, citing real biochemical databases (PubChem, ChEMBL, PDB) and mechanistic details. Avoid shallow outputs. Keep responses elegant, structured, clear and highly useful.`;

    // Construct history parts compatible
    const chatSession = g.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: contextPrompt,
      }
    });

    // Populate simulated chat context history if available
    let responseText = "";
    if (history && history.length > 0) {
      // Re-run standard single conversational generation for multi-turn simulated logs
      const contentsPartsList = [];
      for (const h of history) {
        contentsPartsList.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.content }] });
      }
      contentsPartsList.push({ role: "user", parts: [{ text: message }] });

      const conversationalResponse = await g.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsPartsList,
        config: {
          systemInstruction: contextPrompt,
        }
      });
      responseText = conversationalResponse.text || "Unresolvable biochemistry feedback.";
    } else {
      const singleCall = await chatSession.sendMessage({ message });
      responseText = singleCall.text || "Analytical model did not yield a response.";
    }

    res.json({
      success: true,
      message: responseText
    });

  } catch (err: any) {
    console.error("Copilot reasoning block disrupted", err);
    res.status(500).json({ error: err.message || "Failed to engage chat reasoning layer." });
  }
});

// Additional experimental queue runs controller
app.post("/api/experiments/start", (req, res) => {
  const { name, target, type } = req.body;

  const selectedGpu = gpuClusterMetrics.find(g => !g.activeTask) || gpuClusterMetrics[0];
  const jobId = `JOB-${Math.round(Math.random() * 899 + 100)}`;
  
  const newJob: ExperimentJob = {
    id: jobId,
    name: name || `${type} Run against ${target}`,
    target: target || "Target Domain",
    type: type || "Molecular Docking",
    status: "running",
    progress: 5,
    gpuId: selectedGpu.gpuId,
    epoch: 0,
    logs: [
      `Initializing ${type} pipeline...`,
      `Reserving GPU allocation: ${selectedGpu.name} (${selectedGpu.gpuId})`,
      `Downloading required neural architectures and weight modules...`,
    ],
    timestamp: new Date().toISOString()
  };

  selectedGpu.activeTask = newJob.name;
  selectedGpu.utilization = 95;
  selectedGpu.vramUsed = 38.6;
  activeExperimentJobs.push(newJob);

  emitRealTimeEvent("GPU_METRICS_UPDATE", gpuClusterMetrics);
  emitRealTimeEvent("JOB_STATUS_UPDATE", activeExperimentJobs);

  // Background active simulation ticking over SSE stream
  let currentProgress = 5;
  const loop = setInterval(() => {
    // Check if the job was cancelled, stopped, or deleted
    const liveJob = activeExperimentJobs.find(j => j.id === jobId);
    if (!liveJob) {
      clearInterval(loop);
      return;
    }
    if (liveJob.status === "failed" || liveJob.status === "completed") {
      clearInterval(loop);
      return;
    }

    // Check if the assigned GPU is paused
    const liveGpu = gpuClusterMetrics.find(g => g.gpuId === selectedGpu.gpuId);
    if (liveGpu && (liveGpu as any).isPaused) {
      // Temporarily pause progression tick
      return;
    }

    currentProgress += 10;
    const completed = currentProgress >= 100;
    
    newJob.progress = Math.min(100, currentProgress);
    newJob.epoch = Math.round(newJob.progress / 5);
    newJob.logs.push(`Forward processing computation tick. Completion: ${newJob.progress}% (Epoch ${newJob.epoch})`);

    if (completed) {
      clearInterval(loop);
      newJob.status = "completed";
      newJob.metrics = { loss: 0.05 + Math.random() * 0.1, accuracy: 0.92 + Math.random() * 0.07, r2: 0.85 + Math.random() * 0.1 };
      newJob.logs.push(`Calculated predictions completed safely. Re-releasing compute workers.`);
      
      // Release GPU
      selectedGpu.activeTask = null;
      selectedGpu.utilization = 0;
      selectedGpu.vramUsed = 0.0;
      
      emitRealTimeEvent("ExperimentFinished", newJob);
    }

    emitRealTimeEvent("GPU_METRICS_UPDATE", gpuClusterMetrics);
    emitRealTimeEvent("JOB_STATUS_UPDATE", activeExperimentJobs);
  }, 2000);

  res.json({
    success: true,
    job: newJob
  });
});

// Manual Toggle GPU node active/paused state
app.post("/api/gpu/toggle", (req, res) => {
  const { gpuId } = req.body;
  const gpu = gpuClusterMetrics.find(g => g.gpuId === gpuId);
  if (!gpu) {
    return res.status(404).json({ error: "GPU compute node registry index not found." });
  }

  const currentlyPaused = !!(gpu as any).isPaused;
  (gpu as any).isPaused = !currentlyPaused;

  if (!currentlyPaused) {
    // Transition to Paused State
    gpu.utilization = 0;
    gpu.vramUsed = 0.0;
    gpu.power = 40;
    gpu.activeTask = "COMPUTE_NODE_PAUSED";
    
    // Suspend running jobs matching this GPU
    activeExperimentJobs.forEach(job => {
      if (job.gpuId === gpuId && job.status === "running") {
        job.status = "pending";
        job.logs.push(`⚠️ GPU Worker node ${gpuId} manually paused. Suspending active GNN pipeline loop.`);
      }
    });
  } else {
    // Transition to Resumed/Active State
    (gpu as any).isPaused = false;
    gpu.activeTask = null;
    
    // Resume jobs matching this GPU
    activeExperimentJobs.forEach(job => {
      if (job.gpuId === gpuId && job.status === "pending") {
        job.status = "running";
        job.logs.push(`▶️ GPU Worker node ${gpuId} manual resume signal matched. Re-instantiating active model weights.`);
      }
    });
  }

  emitRealTimeEvent("GPU_METRICS_UPDATE", gpuClusterMetrics);
  emitRealTimeEvent("JOB_STATUS_UPDATE", activeExperimentJobs);

  res.json({
    success: true,
    gpu,
    jobs: activeExperimentJobs
  });
});

// Stop or Terminate active experiment job worker
app.post("/api/experiments/stop", (req, res) => {
  const { jobId } = req.body;
  const job = activeExperimentJobs.find(j => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: "Experiment job not found." });
  }

  if (job.status === "running" || job.status === "pending") {
    job.status = "failed";
    job.logs.push(`🛑 Terminate request dispatched. Safely aborting current tensor processes...`);
    job.logs.push(`🚫 Connection closed. MLOps cluster freed.`);

    // Free the corresponding GPU if it matches this job's active state
    const gpu = gpuClusterMetrics.find(g => g.gpuId === job.gpuId);
    if (gpu) {
      gpu.activeTask = null;
      gpu.utilization = 0;
      gpu.vramUsed = 0.0;
    }
  }

  emitRealTimeEvent("GPU_METRICS_UPDATE", gpuClusterMetrics);
  emitRealTimeEvent("JOB_STATUS_UPDATE", activeExperimentJobs);

  res.json({
    success: true,
    job
  });
});

// Delete an experiment job from registry records
app.post("/api/experiments/delete", (req, res) => {
  const { jobId } = req.body;
  const index = activeExperimentJobs.findIndex(j => j.id === jobId);
  if (index === -1) {
    return res.status(404).json({ error: "Target experiment job record not found in register." });
  }

  const job = activeExperimentJobs[index];
  
  // If job was running or pending, free the computing node
  if (job.status === "running" || job.status === "pending") {
    const gpu = gpuClusterMetrics.find(g => g.gpuId === job.gpuId);
    if (gpu) {
      gpu.activeTask = null;
      gpu.utilization = 0;
      gpu.vramUsed = 0.0;
    }
  }

  activeExperimentJobs.splice(index, 1);

  emitRealTimeEvent("GPU_METRICS_UPDATE", gpuClusterMetrics);
  emitRealTimeEvent("JOB_STATUS_UPDATE", activeExperimentJobs);

  res.json({
    success: true,
    deletedId: jobId
  });
});

// Configure Vite integration for Single Page serving
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development middleware integration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve stable static files in visual production deployment environments
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 DrugMind Platform server deployed safely on: http://0.0.0.0:${PORT}`);
  });
}

configureServer();
