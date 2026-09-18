import { useState, useCallback } from 'react';
import { Scan, Sparkles, History, Trash2, ShieldCheck, Zap, Barcode, ScanText } from 'lucide-react';
import { CameraViewfinder } from './components/CameraViewfinder';
import { TelemetryHUD } from './components/TelemetryHUD';
import { ScanResultCard } from './components/ScanResultCard';
import type { ScanMode, ScanResult, TelemetryStats } from './core/types';

export function App() {
  const [scanMode, setScanMode] = useState<ScanMode>('auto');
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryStats>({
    fps: 0,
    lastLatencyMs: 0,
    avgLatencyMs: 0,
    framesProcessed: 0,
    engine: 'Idle',
    isScanning: false,
    mode: 'auto',
  });

  const handleDetected = useCallback((result: ScanResult) => {
    setCurrentResult(result);
    setHistory((prev) => [result, ...prev.slice(0, 19)]); // Keep last 20 scans
  }, []);

  const handleTelemetryUpdate = useCallback((stats: TelemetryStats) => {
    setTelemetry(stats);
  }, []);

  const handleResetScan = useCallback(() => {
    setCurrentResult(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handleModeChange = (mode: ScanMode) => {
    setScanMode(mode);
    setCurrentResult(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-2xl flex flex-col gap-5">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-gray-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                <Scan className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                  ScanMesh<span className="text-emerald-400">™</span>
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  DAY 2: DUAL-TRACK OCR
                </span>
              </div>
              <p className="text-xs text-gray-400">Barcode + Micro-OCR Checksum Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-900/60 border border-gray-800 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">GS1 Modulo-10</span>
            <span className="text-emerald-400 font-bold">$0 Cloud</span>
          </div>
        </header>

        {/* Engine Mode Switcher Toolbar */}
        <div className="grid grid-cols-3 gap-2 bg-gray-950/80 p-1.5 rounded-2xl border border-gray-800/80">
          <button
            onClick={() => handleModeChange('auto')}
            className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              scanMode === 'auto'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="truncate">Auto Dual</span>
          </button>

          <button
            onClick={() => handleModeChange('barcode')}
            className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              scanMode === 'barcode'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span className="truncate">Barcode Only</span>
          </button>

          <button
            onClick={() => handleModeChange('ocr')}
            className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              scanMode === 'ocr'
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
            }`}
          >
            <ScanText className="w-3.5 h-3.5" />
            <span className="truncate">Text & Packaging</span>
          </button>
        </div>

        {/* Viewfinder Section */}
        <section className="relative">
          <CameraViewfinder
            onDetected={handleDetected}
            onTelemetryUpdate={handleTelemetryUpdate}
            isLocked={Boolean(currentResult)}
            mode={scanMode}
          />
        </section>

        {/* Verified Target Card or Active Status */}
        {currentResult ? (
          <ScanResultCard result={currentResult} onReset={handleResetScan} />
        ) : null}

        {/* Live Diagnostics & Telemetry HUD */}
        <section>
          <TelemetryHUD stats={telemetry} />
        </section>

        {/* Session Scan History */}
        {history.length > 0 && (
          <section className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Session Log ({history.length})
                </h3>
              </div>
              <button
                onClick={clearHistory}
                className="text-gray-400 hover:text-rose-400 transition-colors p-1"
                title="Clear Session History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <div
                  key={`${item.rawValue}-${item.timestamp}-${idx}`}
                  className="flex items-center justify-between bg-gray-950/60 border border-gray-800/50 rounded-xl px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] flex items-center justify-center font-bold">
                      {history.length - idx}
                    </span>
                    <span className="font-mono font-bold text-gray-200">{item.rawValue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-gray-400 uppercase">
                      {item.source === 'MICRO_OCR_DIGITS'
                        ? 'OCR-DIGITS'
                        : item.source === 'PACKAGING_OCR_TEXT'
                        ? 'OCR-TEXT'
                        : item.format.replace('_', '-')}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 font-semibold">
                      {Math.round(item.latencyMs * 10) / 10}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Instructions / Info Footer */}
        <footer className="text-center text-xs text-gray-400 pt-2 pb-6 border-t border-gray-800/40">
          <p className="flex items-center justify-center gap-1.5 text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dual-Track Active: Scans standard barcodes AND reads printed text/numbers when stripes fail.</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Engine operates 100% on-device via WebAssembly & Native Hardware Acceleration.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
