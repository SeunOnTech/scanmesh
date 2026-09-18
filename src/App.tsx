import { useState, useCallback } from 'react';
import { Scan, Sparkles, History, Trash2, ShieldCheck, ScanText, Barcode } from 'lucide-react';
import { CameraViewfinder } from './components/CameraViewfinder';
import { TelemetryHUD } from './components/TelemetryHUD';
import { ScanResultCard } from './components/ScanResultCard';
import type { ScanResult, TelemetryStats, ScanMode } from './core/types';

export function App() {
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode>('auto');
  const [telemetry, setTelemetry] = useState<TelemetryStats>({
    fps: 0,
    lastLatencyMs: 0,
    avgLatencyMs: 0,
    framesProcessed: 0,
    engine: 'Unified Hybrid',
    isScanning: false,
  });

  const handleDetected = useCallback((result: ScanResult) => {
    setCurrentResult(result);
    setHistory((prev) => [result, ...prev.slice(0, 19)]);
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

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-2xl flex flex-col gap-5">
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
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  VISION ENGINE
                </span>
              </div>
              <p className="text-xs text-gray-400">Universal Barcode & Packaging Text Scanner</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-900/60 border border-gray-800 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">On-Device OCR</span>
            <span className="text-emerald-400 font-bold">$0 Cloud</span>
          </div>
        </header>

        <section className="relative">
          <CameraViewfinder
            onDetected={handleDetected}
            onTelemetryUpdate={handleTelemetryUpdate}
            isLocked={Boolean(currentResult)}
            mode={scanMode}
            onModeChange={setScanMode}
          />
        </section>

        {currentResult ? (
          <ScanResultCard
            result={currentResult}
            onReset={handleResetScan}
          />
        ) : null}

        <section>
          <TelemetryHUD stats={telemetry} />
        </section>

        {history.length > 0 && (
          <section className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Scan History ({history.length})
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

            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {history.map((item, idx) => {
                const isText = item.source === 'PACKAGING_OCR_TEXT' || item.format === 'TEXT';
                return (
                  <div
                    key={`${item.rawValue}-${item.timestamp}-${idx}`}
                    className="flex items-center justify-between bg-gray-950/60 border border-gray-800/50 rounded-xl px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <div className="w-6 h-6 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                        {isText ? (
                          <ScanText className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Barcode className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <span className="font-mono font-medium text-gray-200 truncate">
                        {item.rawValue.replace(/\n/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                          isText
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {item.format.replace('_', '-')}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400">
                        {Math.round(item.latencyMs * 10) / 10}ms
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-gray-400 pt-2 pb-6 border-t border-gray-800/40">
          <p className="flex items-center justify-center gap-1.5 text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Point at any product packaging to scan text, or scan standard barcodes instantly.</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            100% on-device vision compute via WebAssembly & Native Hardware Acceleration.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
