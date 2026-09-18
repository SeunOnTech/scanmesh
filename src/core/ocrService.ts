import { createWorker, PSM, type Worker } from 'tesseract.js';

export type OcrStatus = 'uninitialized' | 'loading' | 'ready' | 'processing' | 'error';

export interface OcrRecognitionResult {
  text: string;
  lines: string[];
  confidence: number;
  latencyMs: number;
}

export type OcrStatusListener = (status: OcrStatus, progress: number) => void;

class OcrService {
  private worker: Worker | null = null;
  private status: OcrStatus = 'uninitialized';
  private loadProgress: number = 0;
  private isBusy: boolean = false;
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

      await this.worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      });

      this.notify('ready', 100);
    } catch (err) {
      console.error('OCR initialization failed:', err);
      this.notify('error', 0);
    }
  }

  public async recognizeText(
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
      const { data } = await this.worker.recognize(canvas as unknown as HTMLCanvasElement);
      const latencyMs = Math.round((performance.now() - start) * 10) / 10;

      const rawText = data.text ? data.text.trim() : '';
      const rawLines = rawText
        .split(/[\r\n]+/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length >= 2 && /[a-zA-Z0-9]/.test(l));

      const cleanedLines = rawLines.filter(
        (line: string) => !/^[^a-zA-Z0-9]+$/.test(line) && line.replace(/[^a-zA-Z]/g, '').length >= 1
      );

      const fullText = cleanedLines.join('\n');
      const confidence = Math.round(data.confidence || 0);

      return {
        text: fullText,
        lines: cleanedLines,
        confidence,
        latencyMs,
      };
    } catch (err) {
      console.warn('OCR recognition error:', err);
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
