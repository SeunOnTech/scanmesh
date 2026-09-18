import React from 'react';
import { Cpu, Gauge, Zap, Activity } from 'lucide-react';
import type { TelemetryStats } from '../core/types';

interface TelemetryHUDProps {
  stats: TelemetryStats;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ stats }) => {
  const isOptimalLatency = stats.lastLatencyMs > 0 && stats.lastLatencyMs < 25;

  return (
    <div className="w-full bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-gray-300 uppercase">
            Vision Pipeline Telemetry
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          LIVE 30Hz
        </span>
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
            Worker Pipeline
          </span>
        </div>

        {/* Active Engine */}
        <div className="bg-gray-950/60 border border-gray-800/60 rounded-xl p-3 col-span-2 sm:col-span-2">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-mono">DECODER ENGINE</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="truncate">
            <span className="text-sm font-semibold text-white font-mono">
              {stats.engine}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block font-mono truncate">
            {stats.activeFormat ? `Target: ${stats.activeFormat.toUpperCase()}` : 'Universal Auto-Negotiate'}
          </span>
        </div>
      </div>
    </div>
  );
};
