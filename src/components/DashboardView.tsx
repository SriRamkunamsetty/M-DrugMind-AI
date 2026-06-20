import React, { useState, useMemo } from "react";
import { MoleculeCandidate, GPUMetrics, ExperimentJob } from "../types";
import {
  Cpu,
  Database,
  Layers,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ListFilter,
  FileSpreadsheet,
  Trash2,
  X,
  Pause,
  Play
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import ConfirmationDialog from "./ConfirmationDialog";

interface DashboardViewProps {
  molecules: MoleculeCandidate[];
  gpuMetrics: GPUMetrics[];
  jobs: ExperimentJob[];
  stats: {
    moleculesCount: number;
    targetsAnalyzed: number;
    extractedPapers: number;
    runningWorkers: number;
    clusterGPUUtilization: number;
  };
  onSelectMolecule: (mol: MoleculeCandidate) => void;
  onTriggerExperiment: (type: string) => void;
  onToggleGpu?: (gpuId: string) => void;
  onStopJob?: (jobId: string) => void;
  onDeleteJob?: (jobId: string) => void;
}

export default function DashboardView({
  molecules,
  gpuMetrics,
  jobs,
  stats,
  onSelectMolecule,
  onTriggerExperiment,
  onToggleGpu,
  onStopJob,
  onDeleteJob
}: DashboardViewProps) {
  
  // State for Candidates List Sort dropdown
  const [sortBy, setSortBy] = useState<"dockingPoseScore" | "bindingAffinity" | "timestamp" | "molecularWeight">("dockingPoseScore");

  // State for Confirmation Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [modalType, setModalType] = useState<"stop" | "delete">("stop");
  const [selectedJob, setSelectedJob] = useState<ExperimentJob | null>(null);

  // Sorting logic based on user selection
  const sortedMolecules = useMemo(() => {
    return [...molecules].sort((a, b) => {
      switch (sortBy) {
        case "timestamp":
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case "bindingAffinity":
          // nanometers (nM): smaller is more potent
          return a.bindingAffinity - b.bindingAffinity;
        case "molecularWeight":
          return b.molecularWeight - a.molecularWeight;
        case "dockingPoseScore":
        default:
          // kcal/mol: negative means stronger binding (e.g. -9.2 is stronger than -7.8)
          return a.dockingPoseScore - b.dockingPoseScore;
      }
    });
  }, [molecules, sortBy]);

  // Custom interactive mock telemetry charts data matching modern clinical research distribution
  const bindingAffinityDistribution = sortedMolecules.map((m) => ({
    name: m.id,
    Score: m.dockingPoseScore,
    Affinity: m.bindingAffinity
  }));

  const activeRunningCount = jobs.filter((j) => j.status === "running").length;

  const handleModalConfirm = () => {
    if (!selectedJob) return;
    
    if (modalType === "stop") {
      onStopJob?.(selectedJob.id);
    } else if (modalType === "delete") {
      onDeleteJob?.(selectedJob.id);
    }
    
    setIsDialogOpen(false);
    setSelectedJob(null);
  };

  const handleModalCancel = () => {
    setIsDialogOpen(false);
    setSelectedJob(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn" id="dashboard-tab-container">
      {/* Dynamic Telemetry Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="stats-grid">
        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl space-y-1" id="stat-molecules">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Candidate Registry</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{stats.moleculesCount}</div>
          <p className="text-[10px] text-gray-500">Fully screened chemical leads</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl space-y-1" id="stat-targets">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Targets Indexed</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{stats.targetsAnalyzed}</div>
          <p className="text-[10px] text-gray-500">Active PDB protein files scans</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl space-y-1" id="stat-papers">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Indexed Protocols</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{stats.extractedPapers}</div>
          <p className="text-[10px] text-gray-500">Literature pipelines ingested</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl space-y-1" id="stat-workers">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Running Compute Jobs</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{activeRunningCount}</div>
          <p className="text-[10px] text-gray-500">Event streaming workers online</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl space-y-1" id="stat-cluster">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Core Cluster Util</span>
            <Cpu className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{stats.clusterGPUUtilization}%</div>
          <p className="text-[10px] text-gray-500">Dynamic workload occupancy</p>
        </div>
      </div>

      {/* GPU Nodes Registry & Active Job Worker Queue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="gpu-jobs-grid">
        {/* NVIDIA GPU Active Cluster Tracker */}
        <div className="lg:col-span-4 bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-4" id="gpu-monitoring-panel">
          <div className="flex items-center justify-between border-b border-gray-850 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200">GPU Infrastructure Cluster</h3>
            <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Synchronized
            </span>
          </div>

          <div className="space-y-4" id="gpu-listing">
            {gpuMetrics.map((gpu) => (
              <div 
                key={gpu.gpuId} 
                className={`p-3 rounded-xl border space-y-2 transition-all duration-350 ${
                  gpu.isPaused 
                    ? "bg-amber-950/10 border-amber-900/30 shadow-[inset_0_1px_2px_rgba(245,158,11,0.05)]" 
                    : "bg-gray-900/30 border-gray-850 hover:border-gray-800"
                }`} 
                id={`gpu-card-${gpu.gpuId}`}
              >
                <div className="flex justify-between items-start text-xs gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-gray-300 block leading-tight">{gpu.name}</span>
                    <span className="text-[9px] font-mono text-gray-500">{gpu.gpuId}</span>
                  </div>

                  {/* Manual Toggle Switch */}
                  <div className="flex items-center gap-2 bg-gray-950/80 border border-gray-850/80 px-2 py-1 rounded-lg shrink-0">
                    <span className={`text-[8px] font-mono font-bold tracking-wider ${gpu.isPaused ? "text-amber-500" : "text-emerald-400"}`}>
                      {gpu.isPaused ? "PAUSED" : "ACTIVE"}
                    </span>
                    <button
                      onClick={() => onToggleGpu?.(gpu.gpuId)}
                      className={`relative w-8.5 h-4.5 rounded-full p-0.5 transition duration-200 outline-none cursor-pointer border ${
                        gpu.isPaused 
                          ? "bg-amber-900/20 border-amber-500/25" 
                          : "bg-emerald-950 border-emerald-500/30"
                      }`}
                      id={`gpu-toggle-${gpu.gpuId}`}
                      title={gpu.isPaused ? "Resume worker calculations" : "Temporarily pause worker"}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full transition duration-200 transform shadow-md ${
                          gpu.isPaused ? "translate-x-3.5 bg-amber-400" : "translate-x-0 bg-emerald-400"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Utilization Progress Bar (Only show active metrics if not paused) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Core Computing Power</span>
                    <span className={`font-mono ${gpu.isPaused ? "text-amber-500 font-bold" : "text-cyan-400"}`}>
                      {gpu.isPaused ? "0% (Dormant)" : `${Math.round(gpu.utilization)}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-850">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        gpu.isPaused
                          ? "bg-gray-800"
                          : "bg-gradient-to-r from-cyan-500 to-blue-500"
                      }`}
                      style={{ width: `${gpu.isPaused ? 0 : gpu.utilization}%` }}
                    />
                  </div>
                </div>

                {/* VRAM / Temp / Power Stats */}
                <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-400 font-mono" id={`gpu-telemetry-${gpu.gpuId}`}>
                  <div className="bg-gray-950/60 p-1.5 rounded text-center border border-gray-855">
                    <span className="text-gray-500 block">VRAM</span>
                    <span>{gpu.isPaused ? "0.0" : gpu.vramUsed.toFixed(1)} / {gpu.vramTotal} GB</span>
                  </div>
                  <div className="bg-gray-950/60 p-1.5 rounded text-center border border-gray-855">
                    <span className="text-gray-500 block">TEMP</span>
                    <span>{gpu.isPaused ? "30" : Math.round(gpu.temp)}°C</span>
                  </div>
                  <div className="bg-gray-950/60 p-1.5 rounded text-center border border-gray-855">
                    <span className="text-gray-500 block">POWER</span>
                    <span>{gpu.isPaused ? "40" : Math.round(gpu.power)}W</span>
                  </div>
                </div>

                {/* Assigned Model Task */}
                <div className="text-[10px] text-gray-400 flex items-center gap-1.5 pt-1.5 border-t border-gray-850">
                  <span className={`w-1.5 h-1.5 rounded-full ${gpu.isPaused ? "bg-amber-500 animate-pulse" : "bg-indigo-500"}`} />
                  <span className="font-semibold text-gray-500">Pipeline State:</span>
                  <span className={`truncate ${gpu.isPaused ? "text-amber-500 font-bold" : "text-indigo-300"}`}>
                    {gpu.isPaused ? "Node Computing Suspended" : (gpu.activeTask || "Node Idle / Standby")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MLOps Active Simulation Experiments Runner Queue */}
        <div className="lg:col-span-8 bg-gray-950/60 border border-gray-800 p-5 rounded-2xl flex flex-col justify-between" id="mlops-jobs-panel">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-850 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200">ML Training & Experiment Queue</h3>
                <p className="text-[10px] text-gray-500 font-sans">Active GraphDTA docking simulations and generative updates</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onTriggerExperiment("QSAR Affinity")}
                  className="px-2.5 py-1 rounded bg-gray-900 border border-gray-800 hover:border-gray-700 text-[10px] font-mono text-cyan-400 transition cursor-pointer"
                  id="trigger-affinity-job-btn"
                >
                  + Train Affinity
                </button>
                <button
                  onClick={() => onTriggerExperiment("ChemBERTa Toxicity")}
                  className="px-2.5 py-1 rounded bg-gray-900 border border-gray-800 hover:border-gray-700 text-[10px] font-mono text-emerald-400 transition cursor-pointer"
                  id="trigger-toxicity-job-btn"
                >
                  + Train Safety
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1" id="jobs-listing">
              {jobs.length === 0 ? (
                <div className="text-center py-12 text-xs font-mono text-gray-500 border border-dashed border-gray-850 rounded-xl">
                  NO EXPERIMENTAL WORK LOADS ACTIVE IN MLOps QUEUE
                </div>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className={`p-4 rounded-xl border space-y-3 transition duration-150 ${job.status === "failed" ? "bg-red-950/5 border-red-950/45" : "bg-gray-900/40 border-gray-850"}`} id={`job-item-${job.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white font-mono">{job.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-gray-500 font-bold">ID: {job.id}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-[10px] text-gray-400 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-850">{job.type}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-[10px] font-mono text-cyan-400">Node: {job.gpuId}</span>
                        </div>
                      </div>

                      {/* Status & Actions Controls */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {job.status === "running" && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 text-[9px] font-mono border border-blue-900">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> RUNNING
                          </span>
                        )}
                        {job.status === "pending" && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 text-[9px] font-mono border border-amber-900 animate-pulse">
                            <Pause className="w-2.5 h-2.5" /> STANDBY
                          </span>
                        )}
                        {job.status === "completed" && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[9px] font-mono border border-emerald-900">
                            <CheckCircle className="w-2.5 h-2.5" /> VERIFIED
                          </span>
                        )}
                        {job.status === "failed" && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950 text-red-500 text-[9px] font-mono border border-red-900">
                            <AlertTriangle className="w-2.5 h-2.5" /> ABORTED
                          </span>
                        )}

                        {/* Stop/Terminate click container */}
                        {(job.status === "running" || job.status === "pending") && (
                          <button
                            onClick={() => {
                              setSelectedJob(job);
                              setModalType("stop");
                              setDialogTitle("Abort Simulation Job");
                              setDialogMessage(`Are you absolutely sure you want to pause or abort active experiment '${job.name}' (ID: ${job.id})? This will suspend weight training matrices.`);
                              setIsDialogOpen(true);
                            }}
                            className="px-2 py-1 bg-red-950/20 hover:bg-red-900/50 border border-red-900/30 hover:border-red-500/35 text-red-400 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                            title="Kill computing cluster job"
                            id={`stop-job-btn-${job.id}`}
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Terminate
                          </button>
                        )}

                        {/* Delete entry container */}
                        <button
                          onClick={() => {
                            setSelectedJob(job);
                            setModalType("delete");
                            setDialogTitle("Purge Record Registry");
                            setDialogMessage(`Are you sure you want to permanently clear experiment candidate '${job.id}' registry records from DrugMind? This action cannot be undone.`);
                            setIsDialogOpen(true);
                          }}
                          className="px-2 py-1 bg-gray-950 hover:bg-gray-900 border border-gray-850 hover:border-gray-700 text-gray-500 hover:text-white rounded text-[9px] font-mono transition cursor-pointer flex items-center gap-1"
                          title="Purge computational log"
                          id={`delete-job-btn-${job.id}`}
                        >
                          <X className="w-2.5 h-2.5" /> Purge
                        </button>
                      </div>
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-850">
                        <div
                          className={`h-full transition-all duration-500 ${
                            job.status === "failed" ? "bg-red-500" : job.status === "pending" ? "bg-amber-500/50" : "bg-cyan-500"
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      {job.metrics && (
                        <div className="flex gap-4 text-[9px] font-mono text-gray-500 bg-gray-950/80 p-2 rounded border border-gray-900" id={`job-metrics-${job.id}`}>
                          {job.metrics.loss !== undefined && (
                            <span>Loss: <span className="text-red-400">{(job.metrics.loss).toFixed(3)}</span></span>
                          )}
                          {job.metrics.accuracy !== undefined && (
                            <span>Acc: <span className="text-emerald-400">{(job.metrics.accuracy * 100).toFixed(1)}%</span></span>
                          )}
                          {job.metrics.r2 !== undefined && (
                            <span>R² Quality: <span className="text-cyan-400">{(job.metrics.r2).toFixed(2)}</span></span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dynamic Logs Terminal Console */}
                    <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-850 font-mono text-[9px] text-gray-400 space-y-1 leading-normal" id={`job-terminal-${job.id}`}>
                      <span className="text-gray-500 block border-b border-gray-850 pb-1 mb-1">CONSOLE STDOUT LOGS</span>
                      <div className="max-h-[80px] overflow-y-auto space-y-0.5">
                        {job.logs.map((log, i) => (
                          <div key={i} className="flex gap-1.5">
                            <span className="text-gray-600">[{i+1}]</span>
                            <span className="truncate">{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Structured Molecule Ranking Scaffolds Table */}
      <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-5 space-y-4" id="molecule-ranking-analytics">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-850 pb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200">Discovered Compound Rankings</h3>
            <p className="text-[10px] text-gray-500 font-sans">Therapeutic candidates categorized by predicted Docking Pose Affinity</p>
          </div>
          
          {/* Sorting Dropdown Switch */}
          <div className="flex items-center gap-2 self-start sm:self-center relative">
            <span className="text-[10px] font-mono text-gray-500 uppercase flex items-center gap-1 shrink-0">
              <ListFilter className="w-3.5 h-3.5 text-cyan-400" /> Sort Candidates:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-900 border border-gray-800 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 outline-none hover:border-gray-700 duration-150 cursor-pointer"
              id="molecule-sort-dropdown"
            >
              <option value="dockingPoseScore">Docking Pose Score (More Negative first)</option>
              <option value="bindingAffinity">Binding Affinity Score (Lowest IC50/Kd nM)</option>
              <option value="timestamp">Generation Timestamp (Newest first)</option>
              <option value="molecularWeight">Molecular Weight (Highest first)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto" id="molecules-main-table">
          <table className="w-full text-left text-xs text-gray-300">
            <thead>
              <tr className="border-b border-gray-850 text-gray-500 text-[10px] font-mono uppercase">
                <th className="py-2.5 px-3">Candidate ID</th>
                <th className="py-2.5 px-3">Molecular Name</th>
                <th className="py-2.5 px-3">Formula</th>
                <th className="py-2.5 px-3">MW (g/mol)</th>
                <th className="py-2.5 px-3">LogP</th>
                <th className="py-2.5 px-3">Lipinski</th>
                <th className="py-2.5 px-3">Binding Affinity</th>
                <th className="py-2.5 px-3">Docking Pose</th>
                <th className="py-2.5 px-3 text-right">Interactive 3D</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850 font-sans text-xs">
              {sortedMolecules.map((mol) => (
                <tr
                  key={mol.id}
                  onClick={() => onSelectMolecule(mol)}
                  className="hover:bg-gray-900/40 cursor-pointer transition border-b border-gray-900"
                  id={`table-row-${mol.id}`}
                >
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400">{mol.id}</td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-white block">{mol.name}</span>
                    <span className="text-[10px] text-gray-500 truncate block max-w-xs">{mol.chemicalName}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-gray-400">{mol.formula}</td>
                  <td className="py-3 px-3 font-mono text-[11px]">{mol.molecularWeight.toFixed(2)}</td>
                  <td className="py-3 px-3 font-mono text-[11px]">{mol.logP.toFixed(2)}</td>
                  <td className="py-3 px-3">
                    {mol.lipinskiRule ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-900 font-mono">Passed</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 text-[10px] border border-red-900 font-mono">Violated</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] font-bold text-emerald-400">
                    {mol.bindingAffinity ? `${mol.bindingAffinity.toFixed(1)} nM` : "Unrated"}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] font-bold text-blue-400">{mol.dockingPoseScore}</td>
                  <td className="py-3 px-3 text-right">
                    <button className="px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800 text-[10px] text-cyan-300 font-mono hover:bg-cyan-900 duration-200 cursor-pointer">
                      Query 33D
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationDialog
        isOpen={isDialogOpen}
        title={dialogTitle}
        message={dialogMessage}
        type={modalType === "stop" ? "warning" : "danger"}
        confirmText={modalType === "stop" ? "Abort Simulation" : "Delete Record"}
        cancelText="Cancel"
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
