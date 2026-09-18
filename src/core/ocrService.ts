import { createWorker, PSM, type Worker } from 'tesseract.js';
import {
  extractValidProductCodes,
  extractProductLabels,
  type ValidatedProductCode,
  type ExtractedProductLabel,
} from './checksum';

export type OcrStatus = 'uninitialized' | 'loading' | 'ready' | 'processing' | 'error';

export interface OcrRecognitionResult {
  rawText: string;
  confidence: number;
  latencyMs: number;
  validatedCodes: ValidatedProductCode[];
  extractedLabel: ExtractedProductLabel;
}

export type OcrStatusListener = (status: OcrStatus, progress: number) => void;

class OcrService {
  private worker: Worker | null = null;
  private status: OcrStatus = 'uninitialized';
  private loadProgress: number = 0;
  private isBusy: boolean = false;
  private currentMode: 'digits' | 'text' = 'digits';
  private listeners: Set<OcrStatusListener> = new Set();

  public subscribe(listener: OcrStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.loadProgress);
    return () => this.listeners.delete(listener);
  }

  private notify(status: OcrStatus, progress: number = this.loadProgress) {
    this.status = status;
    this.loadProgress = progress;
    this.listeners.forEach((l) => l(status, progress));
  }

  public get currentStatus(): OcrStatus {
    return this.status;
  }

  public get progress(): number {
    return this.loadProgress;
  }

  public get ready(): boolean {
    return this.status === 'ready' && this.worker !== null;
  }

  public get busy(): boolean {
    return this.isBusy;
  }

  public async init(): Promise<void> {
    if (this.worker || this.status === 'loading') return;
    this.notify('loading', 5);

    try {
      // Create dedicated Tesseract worker with progress logger
      this.worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core') {
            this.notify('loading', 25);
          } else if (m.status === 'loading language traineddata') {
            const prog = Math.round(30 + (m.progress || 0) * 40);
            this.notify('loading', prog);
          } else if (m.status === 'initializing api') {
            this.notify('loading', 85);
          }
        },
      });

      // Default to single line digits mode for rapid barcode numbers
      await this.setMode('digits');
      this.notify('ready', 100);
    } catch (err) {
      console.error('OCR initialization failed:', err);
      this.notify('error', 0);
    }
  }

  public async setMode(mode: 'digits' | 'text') {
    if (!this.worker || (this.currentMode === mode && this.ready)) return;

    this.currentMode = mode;
    try {
      if (mode === 'digits') {
        await this.worker.setParameters({
          tessedit_char_whitelist: '0123456789 ',
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
        });
      } else {
        await this.worker.setParameters({
          tessedit_char_whitelist: '',
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });
      }
    } catch (err) {
      console.warn('Failed to update OCR parameters:', err);
    }
  }

  /**
   * High-precision scan on the isolated barcode number band
   */
  public async recognizeNumberStrip(
    canvas: HTMLCanvasElement | OffscreenCanvas
  ): Promise<OcrRecognitionResult | null> {
    if (!this.worker || this.isBusy) {
      if (!this.worker && this.status !== 'loading') {
        this.init();
      }
      return null;
    }

    this.isBusy = true;
    this.notify('processing');
    const start = performance.now();

    try {
      if (this.currentMode !== 'digits') {
        await this.setMode('digits');
      }

      const { data } = await this.worker.recognize(canvas as unknown as HTMLCanvasElement);
      const latencyMs = Math.round((performance.now() - start) * 10) / 10;

      const rawText = data.text ? data.text.trim() : '';
      const confidence = Math.round(data.confidence || 0);

      // Validate through GS1 Modulo-10 Checksum Gate
      const validatedCodes = extractValidProductCodes(rawText);
      const extractedLabel = extractProductLabels(rawText);

      return {
        rawText,
        confidence,
        latencyMs,
        validatedCodes,
        extractedLabel,
      };
    } catch (err) {
      console.warn('Number strip OCR error:', err);
      return null;
    } finally {
      this.isBusy = false;
      this.notify('ready', 100);
    }
  }

  /**
   * Scan for full packaging text (Product title, Brand, Unit size)
   */
  public async recognizePackagingText(
    canvas: HTMLCanvasElement | OffscreenCanvas
  ): Promise<OcrRecognitionResult | null> {
    if (!this.worker || this.isBusy) {
      if (!this.worker && this.status !== 'loading') {
        this.init();
      }
      return null;
    }

    this.isBusy = true;
    this.notify('processing');
    const start = performance.now();

    try {
      if (this.currentMode !== 'text') {
        await this.setMode('text');
      }

      const { data } = await this.worker.recognize(canvas as unknown as HTMLCanvasElement);
      const latencyMs = Math.round((performance.now() - start) * 10) / 10;

      const rawText = data.text ? data.text.trim() : '';
      const confidence = Math.round(data.confidence || 0);

      const validatedCodes = extractValidProductCodes(rawText);
      const extractedLabel = extractProductLabels(rawText);

      return {
        rawText,
        confidence,
        latencyMs,
        validatedCodes,
        extractedLabel,
      };
    } catch (err) {
      console.warn('Packaging text OCR error:', err);
      return null;
    } finally {
      this.isBusy = false;
      this.notify('ready', 100);
    }
  }

  public async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.notify('uninitialized', 0);
    }
  }
}

export const ocrService = new OcrService();
