import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Info, ShieldAlert, X } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = "warning"
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Dialog Card - Premium Glass */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_2.5px_rgba(255,255,255,0.15)] backdrop-blur-xl z-10"
            id="confirmation-modal-dialog"
          >
            {/* Glossy Diagonal Reflection Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none" />

            {/* Title Header area */}
            <div className="flex items-start gap-3.5">
              <div 
                className={`p-2.5 rounded-xl border ${
                  type === "danger" 
                    ? "bg-red-950/50 border-red-500/30 text-red-400"
                    : type === "warning"
                      ? "bg-amber-950/50 border-amber-500/30 text-amber-400"
                      : "bg-blue-950/50 border-blue-500/30 text-blue-400"
                }`}
              >
                {type === "danger" && <ShieldAlert className="w-5 h-5" />}
                {type === "warning" && <AlertTriangle className="w-5 h-5" />}
                {type === "info" && <Info className="w-5 h-5" />}
              </div>
              
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-white">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">{message}</p>
              </div>

              <button 
                onClick={onCancel}
                className="text-gray-500 hover:text-white transition duration-150 p-1 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-end gap-2.5 mt-6 border-t border-white/5 pt-4">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition duration-150"
                id="modal-cancel-btn"
              >
                {cancelText}
              </button>
              
              <button
                onClick={() => {
                  onConfirm();
                }}
                className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white rounded-xl transition duration-150 shadow-md ${
                  type === "danger"
                    ? "bg-red-650 hover:bg-red-600 border border-red-500/40 shadow-red-950/30"
                    : type === "warning"
                      ? "bg-amber-600 hover:bg-amber-500 border border-amber-400/40 shadow-amber-950/30"
                      : "bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/40 shadow-cyan-950/30"
                }`}
                id="modal-confirm-btn"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
