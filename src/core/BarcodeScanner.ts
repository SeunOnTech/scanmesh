import type {
  BarcodeFormat,
  ScanResult,
  TelemetryStats,
  WorkerInMessage,
  WorkerOutMessage,
} from './types';
import { soundEngine } from './audio';
import { triggerHaptic } from './haptics';

export interface BarcodeScannerCallbacks {
  onDetected: (result: ScanResult) => void;
  onTelemetryUpdate: (stats: TelemetryStats) => void;
  onError?: (err: Error) => void;
}

export class BarcodeScannerService {
  private worker: Worker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private offscreenCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private canvasCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;

  private isRunning: boolean = false;
  private isProcessingFrame: boolean = false;
  private animationFrameId: number | null = null;

  // Telemetry & FPS tracking
  private frameCount: number = 0;
  private lastFpsUpdateTime: number = performance.now();
  private currentFps: number = 0;
  private latencyHistory: number[] = [];
  private activeEngine: 'Native BarcodeDetector' | 'Polyfill Engine' | 'Idle' = 'Idle';

  // Debounce & scan lock
  private lastScannedCode: string | null = null;
  private lastScanTime: number = 0;
  private debounceMs: number = 1500; // Prevent duplicate rapid scans

  private callbacks: BarcodeScannerCallbacks;
  private formats: BarcodeFormat[];
  private roiSize: number;

  constructor(
    callbacks: BarcodeScannerCallbacks,
    options?: {
      formats?: BarcodeFormat[];
      roiSize?: number;
      debounceMs?: number;
    }
  ) {
    this.callbacks = callbacks;
    this.formats = options?.formats || [
      'ean_13',
      'ean_8',
      'upc_a',
      'upc_e',
      'code_128',
      'code_39',
      'qr_code',
      'data_matrix',
    ];
    this.roiSize = options?.roiSize || 260;
    if (options?.debounceMs !== undefined) {
      this.debounceMs = options.debounceMs;
    }

    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new Worker(
        new URL('../workers/scanner.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (err) => {
        console.error('ScanMesh Worker Error:', err);
        this.callbacks.onError?.(new Error('Scanner worker encounter error'));
      };

      const initMsg: WorkerInMessage = {
        type: 'INIT',
        formats: this.formats,
      };
      this.worker.postMessage(initMsg);
    } catch (err) {
      console.error('Failed to instantiate Web Worker:', err);
      this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private handleWorkerMessage(msg: WorkerOutMessage) {
    this.isProcessingFrame = false;

    if (msg.type === 'INIT_SUCCESS') {
      this.activeEngine = msg.engine;
      this.emitTelemetry(0);
      return;
    }

    if (msg.type === 'FRAME_RESULT') {
      const { success, result, latencyMs } = msg;

      // Update rolling telemetry stats
      this.recordLatency(latencyMs);

      if (success && result) {
        const now = performance.now();
        const isDuplicate =
          this.lastScannedCode === result.rawValue &&
          now - this.lastScanTime < this.debounceMs;

        if (!isDuplicate) {
          this.lastScannedCode = result.rawValue;
          this.lastScanTime = now;

          // Sensory confirmation
          soundEngine.playSuccessBeep();
          triggerHaptic('success');

          const scanResult: ScanResult = {
            rawValue: result.rawValue,
            format: result.format,
            cornerPoints: result.cornerPoints,
            timestamp: Date.now(),
            latencyMs,
          };

          this.callbacks.onDetected(scanResult);
        }
      }

      this.emitTelemetry(latencyMs, result?.format);
    }
  }

  private recordLatency(latencyMs: number) {
    this.frameCount++;
    this.latencyHistory.push(latencyMs);
    if (this.latencyHistory.length > 30) {
      this.latencyHistory.shift();
    }

    const now = performance.now();
    const elapsed = now - this.lastFpsUpdateTime;
    if (elapsed >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdateTime = now;
    }
  }

  private emitTelemetry(lastLatencyMs: number, activeFormat?: string) {
    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    const avgLatencyMs =
      this.latencyHistory.length > 0 ? sum / this.latencyHistory.length : 0;

    this.callbacks.onTelemetryUpdate({
      fps: this.currentFps,
      lastLatencyMs: Math.round(lastLatencyMs * 10) / 10,
      avgLatencyMs: Math.round(avgLatencyMs * 10) / 10,
      framesProcessed: this.frameCount,
      engine: this.activeEngine,
      activeFormat,
      isScanning: this.isRunning,
    });
  }

  public attachVideo(video: HTMLVideoElement) {
    this.videoElement = video;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastScannedCode = null;
    this.scheduleNextFrame();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.emitTelemetry(0);
  }

  public resetLock() {
    this.lastScannedCode = null;
    this.lastScanTime = 0;
  }

  private scheduleNextFrame() {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.captureAndProcess();
      this.scheduleNextFrame();
    });
  }

  private async captureAndProcess() {
    if (!this.isRunning || this.isProcessingFrame || !this.videoElement || !this.worker) {
      return;
    }

    const video = this.videoElement;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (videoWidth === 0 || videoHeight === 0) return;

    this.isProcessingFrame = true;

    try {
      // Calculate center Region of Interest (ROI) scaled by configured roiSize
      const minDimension = Math.min(videoWidth, videoHeight);
      const cropRatio = Math.min(0.85, Math.max(0.4, this.roiSize / 400));
      const cropSize = Math.round(minDimension * cropRatio);
      const sx = Math.max(0, Math.round((videoWidth - cropSize) / 2));
      const sy = Math.max(0, Math.round((videoHeight - cropSize) / 2));

      // Extract high-efficiency ImageBitmap directly from the video stream
      if ('createImageBitmap' in window) {
        const bitmap = await createImageBitmap(video, sx, sy, cropSize, cropSize, {
          resizeWidth: 320,
          resizeHeight: 320,
          resizeQuality: 'low', // Fast downsample for sub-20ms speed
        });

        const msg: WorkerInMessage = {
          type: 'DETECT_FRAME',
          bitmap,
          timestamp: performance.now(),
        };

        // Zero-copy transfer of ImageBitmap memory buffer to worker
        this.worker.postMessage(msg, [bitmap]);
      } else {
        // Fallback for environments lacking createImageBitmap
        this.fallbackCanvasCapture(video, sx, sy, cropSize);
      }
    } catch {
      this.isProcessingFrame = false;
    }
  }

  private fallbackCanvasCapture(
    video: HTMLVideoElement,
    sx: number,
    sy: number,
    cropSize: number
  ) {
    if (!this.offscreenCanvas) {
      if (typeof OffscreenCanvas !== 'undefined') {
        this.offscreenCanvas = new OffscreenCanvas(320, 320);
      } else {
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 320;
        this.offscreenCanvas = c;
      }
      this.canvasCtx = this.offscreenCanvas.getContext('2d', {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D;
    }

    if (this.canvasCtx) {
      this.canvasCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 320, 320);
      createImageBitmap(this.offscreenCanvas).then((bitmap) => {
        if (this.worker) {
          this.worker.postMessage(
            {
              type: 'DETECT_FRAME',
              bitmap,
              timestamp: performance.now(),
            },
            [bitmap]
          );
        }
      }).catch(() => {
        this.isProcessingFrame = false;
      });
    } else {
      this.isProcessingFrame = false;
    }
  }

  public destroy() {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
