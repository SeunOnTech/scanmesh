import { useState, useCallback } from 'react';
import { Scan, Sparkles, History, Trash2, ShieldCheck, PackageCheck, ShoppingCart } from 'lucide-react';
import { CameraViewfinder } from './components/CameraViewfinder';
import { TelemetryHUD } from './components/TelemetryHUD';
import { ScanResultCard } from './components/ScanResultCard';
import type { ScanResult, TelemetryStats, StockedItem } from './core/types';

export function App() {
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [stockedInventory, setStockedInventory] = useState<StockedItem[]>([]);
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

  const handleStockItem = useCallback((item: StockedItem) => {
    setStockedInventory((prev) => [item, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const clearInventory = useCallback(() => {
    setStockedInventory([]);
  }, []);

  const totalInventoryValue = stockedInventory.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0
  );

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
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  POINT & STOCK
                </span>
              </div>
              <p className="text-xs text-gray-400">Universal FMCG barcode, packaging & inventory engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-900/60 border border-gray-800 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Master Catalog</span>
            <span className="text-emerald-400 font-bold">$0 Cloud</span>
          </div>
        </header>

        <section className="relative">
          <CameraViewfinder
            onDetected={handleDetected}
            onTelemetryUpdate={handleTelemetryUpdate}
            isLocked={Boolean(currentResult)}
          />
        </section>

        {currentResult ? (
          <ScanResultCard
            result={currentResult}
            onReset={handleResetScan}
            onStockItem={handleStockItem}
          />
        ) : null}

        {stockedInventory.length > 0 && (
          <section className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-emerald-900/40 pb-2.5">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Store Inventory Tray ({stockedInventory.length} SKUs)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                  Total: ₦{totalInventoryValue.toLocaleString()}
                </span>
                <button
                  onClick={clearInventory}
                  className="text-gray-400 hover:text-rose-400 transition-colors p-1"
                  title="Clear Inventory Tray"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {stockedInventory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-gray-950/80 border border-gray-800/80 rounded-xl px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm leading-tight">{item.name}</h4>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {item.brand} • {item.barcode}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 text-sm block">
                      ₦{(item.sellingPrice * item.quantity).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {item.quantity} units @ ₦{item.sellingPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <TelemetryHUD stats={telemetry} />
        </section>

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
                    <div>
                      <span className="font-bold text-gray-200 block">
                        {item.product?.name || item.extractedLabel?.title || item.rawValue}
                      </span>
                      {item.product && (
                        <span className="text-[10px] font-mono text-gray-400">
                          {item.rawValue}
                        </span>
                      )}
                    </div>
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

        <footer className="text-center text-xs text-gray-400 pt-2 pb-6 border-t border-gray-800/40">
          <p className="flex items-center justify-center gap-1.5 text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Point at any product packaging or barcode: automatically resolves product metadata and pre-fills stock inventory.</span>
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
