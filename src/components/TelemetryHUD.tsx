import React from 'react';
import { Cpu, Gauge, Zap, Activity, ScanText, CheckCircle2 } from 'lucide-react';
import type { TelemetryStats } from '../core/types';

interface TelemetryHUDProps {
  stats: TelemetryStats;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ stats }) => {
  const isOptimalLatency = stats.lastLatencyMs > 0 && stats.lastLatencyMs < 35;

  return (
    <div className="w-full bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-gray-300 uppercase">
            Unified Vision Telemetry
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            AUTO-DETECT ACTIVE
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            LIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Frame Latency Metric */}
        <div className="bg-gray-950/60 border border-gray-800/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-mono">FRAME LATENCY</span>
            <Zap className={`w-3.5 h-3.5 ${isOptimalLatency ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl font-bold font-mono tracking-tight ${
                isOptimalLatency ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {stats.lastLatencyMs > 0 ? stats.lastLatencyMs : '--'}
            </span>
            <span className="text-xs text-gray-400 font-mono">ms</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block font-mono">
            Avg: {stats.avgLatencyMs > 0 ? `${stats.avgLatencyMs}ms` : '--'}
          </span>
        </div>

        {/* Processing FPS */}
        <div className="bg-gray-950/60 border border-gray-800/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-mono">DETECTION RATE</span>
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-cyan-400">
              {stats.fps > 0 ? stats.fps : '--'}
            </span>
            <span className="text-xs text-gray-400 font-mono">FPS</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block font-mono">
            Optical Pipeline
          </span>
        </div>

        {/* Active Engine */}
        <div className="bg-gray-950/60 border border-gray-800/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-mono">ACTIVE ENGINE</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="truncate">
            <span className="text-sm font-semibold text-white font-mono truncate block">
              {stats.engine}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block font-mono truncate">
            {stats.activeFormat ? `Target: ${stats.activeFormat.toUpperCase()}` : 'Universal Auto-Lock'}
          </span>
        </div>

        {/* Checksum & OCR Gate */}
        <div className="bg-gray-950/60 border border-gray-800/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-mono">INTEGRITY GATE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-tight truncate">
              GS1 Modulo-10
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono truncate">
            <ScanText className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
            <span className={stats.ocrStatus === 'ready' ? 'text-cyan-400' : 'text-amber-400'}>
              OCR: {stats.ocrEngineStatus || (stats.ocrStatus === 'ready' ? 'Armed' : 'Loading...')}
            </span>
            {stats.ocrConfidence ? (
              <span className="text-emerald-400 font-bold ml-1">({stats.ocrConfidence}%)</span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
};
