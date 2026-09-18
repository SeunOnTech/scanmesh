import type {
  BarcodeFormat,
  ScanResult,
  TelemetryStats,
  WorkerInMessage,
  WorkerOutMessage,
} from './types';
import { soundEngine } from './audio';
import { triggerHaptic } from './haptics';
import { ocrService } from './ocrService';
import {
  extractBarcodeNumberStrip,
  enhancePackagingContrast,
} from './imagePreprocess';

export interface BarcodeScannerCallbacks {
  onDetected: (result: ScanResult) => void;
  onTelemetryUpdate: (stats: TelemetryStats) => void;
  onError?: (err: Error) => void;
}

export class BarcodeScannerService {
  private worker: Worker | null = null;
  private videoElement: HTMLVideoElement | null = null;

  // High-Resolution Native Canvases (No destructive downscaling)
  private fullCropCanvas: HTMLCanvasElement | null = null;
  private fullCropCtx: CanvasRenderingContext2D | null = null;

  private isRunning: boolean = false;
  private isProcessingBarcode: boolean = false;
  private animationFrameId: number | null = null;

  // Telemetry & Status
  private frameCount: number = 0;
  private lastFpsUpdateTime: number = performance.now();
  private currentFps: number = 0;
  private latencyHistory: number[] = [];
  private activeEngine: 'Native BarcodeDetector' | 'Polyfill Engine' | 'Neural Micro-OCR' | 'Unified Hybrid' | 'Idle' = 'Idle';
  private lastOcrConfidence: number = 0;
  private ocrEngineStatus: string = 'Initializing...';

  // Interleaving & Scheduling
  private lastOcrAttemptTime: number = 0;
  private ocrIntervalMs: number = 320;
  private lastBarcodeSeenTime: number = 0;
  private ocrPassAlternator: boolean = false; // Alternates between number-strip & packaging text

  // Debounce & Lock
  private lastScannedCode: string | null = null;
  private lastScanTime: number = 0;
  private debounceMs: number = 1500;

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
    this.initOcr();
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
        this.ocrEngineStatus = 'Recognizing...';
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

      if (success && result) {
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
            modulo10Validated: true,
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
    if (!this.isRunning || !this.videoElement) {
      return;
    }

    const video = this.videoElement;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (videoWidth === 0 || videoHeight === 0) return;

    // Calculate center Region of Interest at FULL NATIVE SENSOR RESOLUTION
    const minDimension = Math.min(videoWidth, videoHeight);
    const cropRatio = Math.min(0.85, Math.max(0.45, this.roiSize / 380));
    const cropSize = Math.round(minDimension * cropRatio);
    const sx = Math.max(0, Math.round((videoWidth - cropSize) / 2));
    const sy = Math.max(0, Math.round((videoHeight - cropSize) / 2));

    const now = performance.now();

    // Prepare full-resolution native crop canvas
    if (!this.fullCropCanvas) {
      this.fullCropCanvas = document.createElement('canvas');
      this.fullCropCanvas.width = cropSize;
      this.fullCropCanvas.height = cropSize;
      this.fullCropCtx = this.fullCropCanvas.getContext('2d', { willReadFrequently: true });
    } else if (this.fullCropCanvas.width !== cropSize) {
      this.fullCropCanvas.width = cropSize;
      this.fullCropCanvas.height = cropSize;
    }

    if (!this.fullCropCtx) return;
    this.fullCropCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);

    // TRACK 1: Real-time Barcode Detection via Worker
    if (!this.isProcessingBarcode && this.worker) {
      this.isProcessingBarcode = true;
      try {
        if ('createImageBitmap' in window) {
          // Send crisp 500px bitmap to barcode worker
          const targetW = Math.min(520, cropSize);
          const bitmap = await createImageBitmap(this.fullCropCanvas, {
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

    // TRACK 2: High-Precision Native OCR (when no barcode was seen in the last 180ms)
    const shouldRunOcr =
      now - this.lastBarcodeSeenTime > 180 &&
      now - this.lastOcrAttemptTime > this.ocrIntervalMs &&
      !ocrService.busy &&
      ocrService.ready;

    if (shouldRunOcr) {
      this.lastOcrAttemptTime = now;
      this.ocrPassAlternator = !this.ocrPassAlternator;
      this.runHighPrecisionOcrPass(this.fullCropCanvas, this.ocrPassAlternator);
    }
  }

  private async runHighPrecisionOcrPass(
    nativeCropCanvas: HTMLCanvasElement,
    runPackagingPass: boolean
  ) {
    try {
      const now = performance.now();

      if (!runPackagingPass) {
        // PASS 1: Dedicated Barcode Number Strip (Bottom 25% horizontal band)
        // Highly targeted, isolates only the 13 OCR-B digits under barcode lines
        const numberStripCanvas = extractBarcodeNumberStrip(nativeCropCanvas);
        const ocrResult = await ocrService.recognizeNumberStrip(numberStripCanvas);

        if (ocrResult && ocrResult.validatedCodes.length > 0) {
          const topCode = ocrResult.validatedCodes[0];
          const isDuplicate =
            this.lastScannedCode === topCode.code &&
            now - this.lastScanTime < this.debounceMs;

          if (!isDuplicate) {
            this.lastScannedCode = topCode.code;
            this.lastScanTime = now;
            this.lastOcrConfidence = ocrResult.confidence;

            soundEngine.playSuccessBeep();
            triggerHaptic('success');

            const scanResult: ScanResult = {
              rawValue: topCode.code,
              format: topCode.format,
              source: 'MICRO_OCR_DIGITS',
              modulo10Validated: true,
              ocrText: ocrResult.rawText,
              timestamp: Date.now(),
              latencyMs: ocrResult.latencyMs,
            };

            this.callbacks.onDetected(scanResult);
            return;
          }
        }
      } else {
        // PASS 2: Packaging Text Pass (Full center crop with soft contrast enhancement)
        const enhancedCanvas = enhancePackagingContrast(nativeCropCanvas, {
          sharpen: true,
          contrastBoost: true,
        });

        const ocrResult = await ocrService.recognizePackagingText(enhancedCanvas);

        if (ocrResult) {
          this.lastOcrConfidence = ocrResult.confidence;

          // Check if it caught valid barcode numbers anywhere in the text
          if (ocrResult.validatedCodes.length > 0) {
            const topCode = ocrResult.validatedCodes[0];
            const isDuplicate =
              this.lastScannedCode === topCode.code &&
              now - this.lastScanTime < this.debounceMs;

            if (!isDuplicate) {
              this.lastScannedCode = topCode.code;
              this.lastScanTime = now;

              soundEngine.playSuccessBeep();
              triggerHaptic('success');

              const scanResult: ScanResult = {
                rawValue: topCode.code,
                format: topCode.format,
                source: 'MICRO_OCR_DIGITS',
                modulo10Validated: true,
                ocrText: ocrResult.rawText,
                timestamp: Date.now(),
                latencyMs: ocrResult.latencyMs,
              };

              this.callbacks.onDetected(scanResult);
              return;
            }
          }

          // Or check if strong packaging title/size candidate is detected
          if (ocrResult.extractedLabel.titleCandidate && ocrResult.confidence > 40) {
            const title = ocrResult.extractedLabel.titleCandidate;
            const isDuplicate =
              this.lastScannedCode === title &&
              now - this.lastScanTime < this.debounceMs;

            if (!isDuplicate) {
              this.lastScannedCode = title;
              this.lastScanTime = now;

              soundEngine.playSuccessBeep();
              triggerHaptic('success');

              const scanResult: ScanResult = {
                rawValue: title,
                format: 'PACKAGING_TEXT',
                source: 'PACKAGING_OCR_TEXT',
                ocrText: ocrResult.rawText,
                extractedLabel: {
                  title: ocrResult.extractedLabel.titleCandidate,
                  size: ocrResult.extractedLabel.sizeCandidate,
                },
                timestamp: Date.now(),
                latencyMs: ocrResult.latencyMs,
              };

              this.callbacks.onDetected(scanResult);
            }
          }
        }
      }
    } catch (err) {
      console.warn('High-precision OCR pass error:', err);
    }
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
