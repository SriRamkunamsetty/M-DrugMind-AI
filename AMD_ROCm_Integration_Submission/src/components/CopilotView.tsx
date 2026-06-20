import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, SelectedTarget, MoleculeCandidate } from "../types";
import { Send, Loader2, Sparkles, User, Bot, HelpCircle, RefreshCw } from "lucide-react";

interface CopilotViewProps {
  targets: SelectedTarget[];
  molecules: MoleculeCandidate[];
  onSendMessage: (message: string, history: ChatMessage[]) => Promise<any>;
}

const PRESET_QUERIES = [
  "Predict compound candidates for EGFR Mutants",
  "Explain logP and blood-brain barrier correlation",
  "Identify binding interactions in Nirmatrelvir",
  "Compare generated candidates liver toxicity profiles"
];

export default function CopilotView({
  targets,
  molecules,
  onSendMessage
}: CopilotViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hello! I am your **DrugMind AI Scientific Copilot**, grounded directly in our active chemical registries, experimental target profiles, and indexed manuscripts. Ask me to formulate compounds, compare candidate safety parameters, model residues, or retrieve bio-pathway details.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, submitting]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSubmitting(true);

    try {
      // Maps standard types ChatMessage[] array to API history format
      const apiHistory = messages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await onSendMessage(textToSend, apiHistory);
      if (res && res.success) {
        const assistantMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          role: "assistant",
          content: res.message,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error("Target copilot neural engine was unresponsive.");
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Reasoning failure: ${err.message || "Failed initializing chat node."}`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn" id="copilot-tab-container">
      {/* Left Column: Interactive Chat Area */}
      <div className="lg:col-span-8 bg-gray-950/60 border border-gray-800 rounded-2xl flex flex-col h-[600px] overflow-hidden" id="chat-engine-card">
        {/* Chat Banner Header */}
        <div className="p-4 border-b border-gray-850 flex justify-between items-center bg-gray-950" id="chat-header">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">DrugMind Copilot Chat</h4>
              <p className="text-[10px] text-gray-500 font-sans">Active Session • Locked onto protein/chemical structures</p>
            </div>
          </div>
          <button
            onClick={() => setMessages([messages[0]])}
            className="p-1.5 rounded hover:bg-gray-900 border border-transparent hover:border-gray-850 text-gray-500 hover:text-gray-300 transition duration-150"
            title="Reset Terminal Conversations"
            id="reset-chat-btn"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Talk Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat-scroller-viewport">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              id={`chat-bubble-${m.id}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0 text-xs ${
                  m.role === "user"
                    ? "bg-cyan-950/40 text-cyan-400 border-cyan-800"
                    : "bg-indigo-950/40 text-indigo-400 border-indigo-900"
                }`}
              >
                {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed space-y-2 select-text ${
                  m.role === "user"
                    ? "bg-cyan-950/30 text-cyan-100 border-cyan-850/60"
                    : "bg-gray-900/30 text-gray-200 border-gray-850"
                }`}
                id={`chat-bubble-text-${m.id}`}
              >
                {/* Visual block highlighting custom markdown bullet keys manually to avoid extra dependencies */}
                <span className="whitespace-pre-wrap block">{m.content}</span>
              </div>
            </div>
          ))}

          {submitting && (
            <div className="flex gap-3 max-w-[85%] mr-auto" id="copilot-typing-bubble">
              <div className="w-7 h-7 rounded-lg bg-indigo-950/40 text-indigo-400 border border-indigo-900 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-gray-900/30 p-3 rounded-xl border border-gray-850 text-xs text-indigo-400 font-mono">
                Computing chemical structures and retrieval vectors...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Console Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="p-3 border-t border-gray-850 bg-gray-950 flex gap-2"
          id="chat-input-row"
        >
          <input
            type="text"
            placeholder="Ask anything about current compounds, PDB models, toxicology screening..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={submitting}
            className="flex-1 bg-gray-900 border border-gray-850 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-600 focus:bg-gray-900/60"
            id="chat-input-bar"
          />
          <button
            type="submit"
            disabled={submitting || !inputValue.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50"
            id="send-chat-btn"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Right Column: Grounded Context Databases and Preset Queries suggestions */}
      <div className="lg:col-span-4 space-y-6" id="chat-grounding-sidebar">
        {/* Suggestive Pregenerated Queries list */}
        <div className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-3" id="quick-queries-card">
          <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-1">
            <HelpCircle className="w-4 h-4" /> Quick Research Prompting
          </h4>
          <div className="grid grid-cols-1 gap-2" id="preset-chat-queries">
            {PRESET_QUERIES.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(q)}
                disabled={submitting}
                className="text-left p-3 rounded-xl bg-gray-900 border border-gray-850 hover:border-gray-800 transition text-xs font-medium text-gray-300 disabled:opacity-50 font-sans leading-snug"
                id={`suggestive-query-${i}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Current Grounded Biochemical Context state display */}
        <div className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-3" id="grounded-databases-status">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-450 font-mono">Grounded active context</h4>
          <div className="space-y-3 font-sans text-xs" id="grounding-details-list">
            <div className="bg-gray-900/40 p-2.5 rounded-lg border border-gray-850" id="grounded-protein">
              <span className="text-[10px] text-emerald-400 fono uppercase font-bold tracking-wider">Targets Locked:</span>
              <p className="font-bold text-white mt-1">
                {targets.length > 0 ? targets.map((t) => t.pdbId).join(", ") : "None Loaded"}
              </p>
              <span className="text-[9px] text-gray-500 mt-0.5 block font-mono">Automatic query-response optimization</span>
            </div>

            <div className="bg-gray-900/40 p-2.5 rounded-lg border border-gray-850" id="grounded-compounds">
              <span className="text-[10px] text-cyan-400 fono uppercase font-bold tracking-wider">Candidates Locked:</span>
              <p className="font-bold text-white mt-1">
                {molecules.length > 0 ? molecules.map((m) => m.id).join(", ") : "None Loaded"}
              </p>
              <span className="text-[9px] text-gray-500 mt-0.5 block font-mono">Linked chemical structure graphs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
