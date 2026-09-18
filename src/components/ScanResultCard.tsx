import React, { useState } from 'react';
import {
  Check,
  Copy,
  Volume2,
  RefreshCw,
  Barcode,
  ScanText,
  VolumeX,
} from 'lucide-react';
import type { ScanResult } from '../core/types';
import { soundEngine } from '../core/audio';

interface ScanResultCardProps {
  result: ScanResult;
  onReset: () => void;
}

export const ScanResultCard: React.FC<ScanResultCardProps> = ({
  result,
  onReset,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const isTextScan = result.source === 'PACKAGING_OCR_TEXT' || result.format === 'TEXT';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.rawValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      soundEngine.playSuccessBeep();
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.rawValue);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const lines = result.lines && result.lines.length > 0
    ? result.lines
    : result.rawValue.split('\n').filter((l) => l.trim().length > 0);

  return (
    <div className="w-full bg-gray-900/95 border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            {isTextScan ? (
              <ScanText className="w-4 h-4 text-cyan-400" />
            ) : (
              <Barcode className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {isTextScan ? 'Product Text Scanned' : 'Barcode Decoded'}
            </h4>
            <span className="text-[11px] text-gray-400 font-mono">
              {isTextScan ? `${lines.length} Line(s) Detected` : 'Hardware Optical Read'}
            </span>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold border uppercase ${
            isTextScan
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          {result.format.replace('_', '-')}
        </span>
      </div>

      <div className="bg-gray-950/90 border border-gray-800 rounded-xl p-4 mb-4">
        {isTextScan ? (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {lines.map((line, idx) => (
              <p
                key={`${idx}-${line}`}
                className="text-base sm:text-lg font-semibold text-white tracking-wide leading-relaxed selection:bg-cyan-500/40"
              >
                {line}
              </p>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto py-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-widest selection:bg-emerald-500/40 block">
              {result.rawValue}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-mono">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {isTextScan ? (
            <button
              onClick={handleSpeak}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-colors flex items-center gap-1.5"
              title="Read Aloud"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Listen</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => soundEngine.playSuccessBeep()}
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors"
              title="Play Chime"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400">
            {Math.round(result.latencyMs * 10) / 10}ms
          </span>

          <button
            onClick={onReset}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Scan Next
          </button>
        </div>
      </div>
    </div>
  );
};
