import type {
  BarcodeFormat,
  ScanResult,
  ScanMode,
  TelemetryStats,
  WorkerInMessage,
  WorkerOutMessage,
} from './types';
import { soundEngine } from './audio';
import { triggerHaptic } from './haptics';
import { ocrService } from './ocrService';
import { enhancePackagingContrast } from './imagePreprocess';

export interface BarcodeScannerCallbacks {
  onDetected: (result: ScanResult) => void;
  onTelemetryUpdate: (stats: TelemetryStats) => void;
  onError?: (err: Error) => void;
}

export class BarcodeScannerService {
  private worker: Worker | null = null;
  private videoElement: HTMLVideoElement | null = null;

  private fullCropCanvas: HTMLCanvasElement | null = null;
  private fullCropCtx: CanvasRenderingContext2D | null = null;

  private isRunning: boolean = false;
  private isProcessingBarcode: boolean = false;
  private animationFrameId: number | null = null;
  private scanMode: ScanMode = 'auto';

  private frameCount: number = 0;
  private lastFpsUpdateTime: number = performance.now();
  private currentFps: number = 0;
  private latencyHistory: number[] = [];
  private activeEngine: 'Native BarcodeDetector' | 'Polyfill Engine' | 'Neural Micro-OCR' | 'Unified Hybrid' | 'Idle' = 'Idle';
  private lastOcrConfidence: number = 0;
  private ocrEngineStatus: string = 'Initializing...';

  private lastOcrAttemptTime: number = 0;
  private ocrIntervalMs: number = 380;
  private lastBarcodeSeenTime: number = 0;

  private lastScannedCode: string | null = null;
  private lastScanTime: number = 0;
  private debounceMs: number = 1500;

  private candidateTextBuffer: string | null = null;
  private candidateMatches: number = 0;

  private callbacks: BarcodeScannerCallbacks;
  private formats: BarcodeFormat[];
  private roiSize: number;
  private unsubscribeOcrListener: (() => void) | null = null;

  constructor(
    callbacks: BarcodeScannerCallbacks,
    options?: {
      formats?: BarcodeFormat[];
      roiSize?: number;
      debounceMs?: number;
      mode?: ScanMode;
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
    if (options?.mode) {
      this.scanMode = options.mode;
    }

    this.initWorker();
    this.initOcr();
  }

  public setMode(mode: ScanMode) {
    this.scanMode = mode;
    this.resetLock();
    this.candidateTextBuffer = null;
    this.candidateMatches = 0;
    this.emitTelemetry(0);
  }

  public getMode(): ScanMode {
    return this.scanMode;
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
        this.callbacks.onError?.(new Error('Scanner worker encountered error'));
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

  private initOcr() {
    this.unsubscribeOcrListener = ocrService.subscribe((status, progress) => {
      if (status === 'loading') {
        this.ocrEngineStatus = `Loading AI (${progress}%)`;
      } else if (status === 'ready') {
        this.ocrEngineStatus = 'Armed (Ready)';
      } else if (status === 'processing') {
        this.ocrEngineStatus = 'Analyzing Text...';
      } else if (status === 'error') {
        this.ocrEngineStatus = 'Error (Retrying)';
      }
      this.emitTelemetry(0);
    });

    ocrService.init();
  }

  private handleWorkerMessage(msg: WorkerOutMessage) {
    this.isProcessingBarcode = false;

    if (msg.type === 'INIT_SUCCESS') {
      this.activeEngine = 'Unified Hybrid';
      this.emitTelemetry(0);
      return;
    }

    if (msg.type === 'FRAME_RESULT') {
      const { success, result, latencyMs } = msg;

      this.recordLatency(latencyMs);

      if (success && result && this.scanMode !== 'text') {
        this.lastBarcodeSeenTime = performance.now();
        const now = performance.now();
        const isDuplicate =
          this.lastScannedCode === result.rawValue &&
          now - this.lastScanTime < this.debounceMs;

        if (!isDuplicate) {
          this.lastScannedCode = result.rawValue;
          this.lastScanTime = now;

          soundEngine.playSuccessBeep();
          triggerHaptic('success');

          const scanResult: ScanResult = {
            rawValue: result.rawValue,
            format: result.format,
            source: 'HARDWARE_BARCODE',
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
      ocrConfidence: this.lastOcrConfidence,
      ocrStatus: ocrService.busy ? 'processing' : ocrService.ready ? 'ready' : 'idle',
      ocrEngineStatus: this.ocrEngineStatus,
    });
  }

  public attachVideo(video: HTMLVideoElement) {
    this.videoElement = video;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastScannedCode = null;
    this.candidateTextBuffer = null;
    this.candidateMatches = 0;
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
    this.candidateTextBuffer = null;
    this.candidateMatches = 0;
  }

  private scheduleNextFrame() {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.captureAndProcess();
      this.scheduleNextFrame();
    });
  }

  private getCropCanvas(): HTMLCanvasElement | null {
    if (!this.videoElement) return null;
    const video = this.videoElement;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (videoWidth === 0 || videoHeight === 0) return null;

    const minDimension = Math.min(videoWidth, videoHeight);
    const cropRatio = Math.min(0.88, Math.max(0.48, this.roiSize / 380));
    const cropSize = Math.round(minDimension * cropRatio);
    const sx = Math.max(0, Math.round((videoWidth - cropSize) / 2));
    const sy = Math.max(0, Math.round((videoHeight - cropSize) / 2));

    if (!this.fullCropCanvas) {
      this.fullCropCanvas = document.createElement('canvas');
      this.fullCropCanvas.width = cropSize;
      this.fullCropCanvas.height = cropSize;
      this.fullCropCtx = this.fullCropCanvas.getContext('2d', { willReadFrequently: true });
    } else if (this.fullCropCanvas.width !== cropSize) {
      this.fullCropCanvas.width = cropSize;
      this.fullCropCanvas.height = cropSize;
    }

    if (!this.fullCropCtx) return null;
    this.fullCropCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);
    return this.fullCropCanvas;
  }

  private async captureAndProcess() {
    if (!this.isRunning || !this.videoElement) {
      return;
    }

    const cropCanvas = this.getCropCanvas();
    if (!cropCanvas) return;

    const now = performance.now();

    if (this.scanMode !== 'text' && !this.isProcessingBarcode && this.worker) {
      this.isProcessingBarcode = true;
      try {
        if ('createImageBitmap' in window) {
          const targetW = Math.min(520, cropCanvas.width);
          const bitmap = await createImageBitmap(cropCanvas, {
            resizeWidth: targetW,
            resizeHeight: targetW,
            resizeQuality: 'medium',
          });
          this.worker.postMessage({ type: 'DETECT_FRAME', bitmap, timestamp: now }, [bitmap]);
        }
      } catch {
        this.isProcessingBarcode = false;
      }
    }

    const shouldRunOcr =
      (this.scanMode === 'text' || now - this.lastBarcodeSeenTime > 500) &&
      now - this.lastOcrAttemptTime > this.ocrIntervalMs &&
      !ocrService.busy &&
      ocrService.ready;

    if (shouldRunOcr) {
      this.lastOcrAttemptTime = now;
      this.runOcrPass(cropCanvas);
    }
  }

  private async runOcrPass(nativeCropCanvas: HTMLCanvasElement) {
    try {
      const now = performance.now();
      const enhancedCanvas = enhancePackagingContrast(nativeCropCanvas, {
        sharpen: true,
        contrastBoost: true,
        targetWidth: 850,
      });

      const ocrResult = await ocrService.recognizeText(enhancedCanvas);
      if (ocrResult && ocrResult.lines.length > 0 && ocrResult.confidence >= 68) {
        this.lastOcrConfidence = ocrResult.confidence;

        const isDuplicate =
          this.lastScannedCode === ocrResult.text &&
          now - this.lastScanTime < this.debounceMs;

        if (isDuplicate) return;

        if (this.scanMode === 'text') {
          this.commitTextResult(ocrResult);
          return;
        }

        if (this.candidateTextBuffer === ocrResult.text) {
          this.candidateMatches++;
          if (this.candidateMatches >= 1) {
            this.commitTextResult(ocrResult);
          }
        } else {
          this.candidateTextBuffer = ocrResult.text;
          this.candidateMatches = 0;
        }
      }
    } catch (err) {
      console.warn('OCR pass error:', err);
    }
  }

  public async scanTextNow(): Promise<ScanResult | null> {
    const cropCanvas = this.getCropCanvas();
    if (!cropCanvas) return null;

    try {
      const enhancedCanvas = enhancePackagingContrast(cropCanvas, {
        sharpen: true,
        contrastBoost: true,
        targetWidth: 900,
      });

      const ocrResult = await ocrService.recognizeText(enhancedCanvas);
      if (ocrResult && ocrResult.lines.length > 0) {
        const scanResult = this.commitTextResult(ocrResult);
        return scanResult;
      }
      return null;
    } catch (err) {
      console.warn('Manual text capture error:', err);
      return null;
    }
  }

  private commitTextResult(ocrResult: {
    text: string;
    lines: string[];
    confidence: number;
    latencyMs: number;
    wordCount: number;
  }): ScanResult {
    const now = performance.now();
    this.lastScannedCode = ocrResult.text;
    this.lastScanTime = now;
    this.candidateTextBuffer = null;
    this.candidateMatches = 0;

    soundEngine.playSuccessBeep();
    triggerHaptic('success');

    const scanResult: ScanResult = {
      rawValue: ocrResult.text,
      format: 'TEXT',
      source: 'PACKAGING_OCR_TEXT',
      lines: ocrResult.lines,
      timestamp: Date.now(),
      latencyMs: ocrResult.latencyMs,
    };

    this.callbacks.onDetected(scanResult);
    return scanResult;
  }

  public destroy() {
    this.stop();
    if (this.unsubscribeOcrListener) {
      this.unsubscribeOcrListener();
      this.unsubscribeOcrListener = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    ocrService.terminate();
  }
}
