import React, { useState } from 'react';
import { Check, Copy, Volume2, RefreshCw, Barcode } from 'lucide-react';
import type { ScanResult } from '../core/types';
import { soundEngine } from '../core/audio';

interface ScanResultCardProps {
  result: ScanResult;
  onReset: () => void;
}

export const ScanResultCard: React.FC<ScanResultCardProps> = ({ result, onReset }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.rawValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <div className="w-full bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-[0_10px_35px_rgba(16,185,129,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Barcode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Target Decoded</h4>
            <p className="text-[11px] text-gray-400">Validated Barcode Signature</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
          {result.format.replace('_', '-')}
        </span>
      </div>

      {/* Raw Value */}
      <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-4 mb-4 flex items-center justify-between group">
        <div className="overflow-x-auto pr-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-widest selection:bg-emerald-500/40">
            {result.rawValue}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => soundEngine.playSuccessBeep()}
            title="Play Audio Chime"
            className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopy}
            title="Copy to Clipboard"
            className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-emerald-400 border border-gray-800 transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-mono">Copied</span>
              </>
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Timing & Action Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
        <div>
          <span>Decode Latency: </span>
          <strong className="text-emerald-400">{Math.round(result.latencyMs * 10) / 10}ms</strong>
        </div>

        <button
          onClick={onReset}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Scan Next
        </button>
      </div>
    </div>
  );
};
