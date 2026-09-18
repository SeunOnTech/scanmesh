import React, { useState } from 'react';
import { Check, Copy, Volume2, RefreshCw, Barcode, ScanText, ShieldCheck, Tag } from 'lucide-react';
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

  const getSourceBadge = () => {
    switch (result.source) {
      case 'HARDWARE_BARCODE':
        return {
          label: 'Hardware Barcode',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <Barcode className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'MICRO_OCR_DIGITS':
        return {
          label: 'Neural Micro-OCR',
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          icon: <ScanText className="w-3.5 h-3.5 text-cyan-400" />,
        };
      case 'PACKAGING_OCR_TEXT':
        return {
          label: 'Packaging Text OCR',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <Tag className="w-3.5 h-3.5 text-amber-400" />,
        };
    }
  };

  const sourceBadge = getSourceBadge();

  return (
    <div className="w-full bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-[0_10px_35px_rgba(16,185,129,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            {sourceBadge.icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Target Decoded</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-gray-400">{sourceBadge.label}</span>
              {result.modulo10Validated && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Modulo-10
                </span>
              )}
            </div>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border uppercase ${sourceBadge.color}`}>
          {result.format.replace('_', '-')}
        </span>
      </div>

      {/* Raw Decoded Value / Label */}
      <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-4 mb-3 flex items-center justify-between group">
        <div className="overflow-x-auto pr-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-widest selection:bg-emerald-500/40 block">
            {result.rawValue}
          </span>
          {result.extractedLabel?.size && (
            <span className="inline-block mt-1 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Unit: {result.extractedLabel.size.toUpperCase()}
            </span>
          )}
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

      {/* Raw OCR Text Context if detected via OCR */}
      {result.ocrText && (
        <div className="bg-gray-950/60 border border-gray-800/50 rounded-lg p-2 mb-3 text-[11px] font-mono text-gray-400 truncate">
          <span className="text-cyan-400 font-semibold">OCR Buffer: </span>
          <span>{result.ocrText}</span>
        </div>
      )}

      {/* Timing & Action Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
        <div>
          <span>Engine Latency: </span>
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
