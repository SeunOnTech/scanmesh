import { createWorker, PSM, type Worker } from 'tesseract.js';
import {
  extractValidProductCodes,
  extractProductLabels,
  type ValidatedProductCode,
  type ExtractedProductLabel,
} from './checksum';

export interface OcrRecognitionResult {
  rawText: string;
  confidence: number;
  latencyMs: number;
  validatedCodes: ValidatedProductCode[];
  extractedLabel: ExtractedProductLabel;
}

class OcrService {
  private worker: Worker | null = null;
  private isInitializing: boolean = false;
  private isReady: boolean = false;
  private isBusy: boolean = false;
  private currentMode: 'digits' | 'text' = 'digits';

  public async init() {
    if (this.worker || this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Initialize Tesseract English worker
      this.worker = await createWorker('eng', 1, {
        logger: () => {}, // Suppress verbose console logs
      });

      // Default to digits + spacing for high-speed barcode reading
      await this.setMode('digits');
      this.isReady = true;
    } catch (err) {
      console.error('Failed to initialize Tesseract OCR worker:', err);
    } finally {
      this.isInitializing = false;
    }
  }

  public async setMode(mode: 'digits' | 'text') {
    if (!this.worker || this.currentMode === mode) return;

    this.currentMode = mode;
    try {
      if (mode === 'digits') {
        await this.worker.setParameters({
          tessedit_char_whitelist: '0123456789 ',
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
        });
      } else {
        await this.worker.setParameters({
          tessedit_char_whitelist: '', // Allow all characters
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        });
      }
    } catch (err) {
      console.warn('Failed to update OCR parameters:', err);
    }
  }

  public get ready(): boolean {
    return this.isReady;
  }

  public get busy(): boolean {
    return this.isBusy;
  }

  public async recognize(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    mode: 'digits' | 'text' = 'digits'
  ): Promise<OcrRecognitionResult | null> {
    if (!this.worker || this.isBusy) {
      if (!this.worker && !this.isInitializing) {
        this.init();
      }
      return null;
    }

    this.isBusy = true;
    const start = performance.now();

    try {
      if (this.currentMode !== mode) {
        await this.setMode(mode);
      }

      // Execute OCR recognition on preprocessed canvas
      const { data } = await this.worker.recognize(canvas as unknown as HTMLCanvasElement);
      const latencyMs = Math.round((performance.now() - start) * 10) / 10;

      const rawText = data.text ? data.text.trim() : '';
      const confidence = Math.round(data.confidence || 0);

      // Validate through strict GS1 Modulo-10 Checksum Gate
      const validatedCodes = extractValidProductCodes(rawText);

      // Extract packaging labels (Title, Size, Brand)
      const extractedLabel = extractProductLabels(rawText);

      return {
        rawText,
        confidence,
        latencyMs,
        validatedCodes,
        extractedLabel,
      };
    } catch (err) {
      console.error('OCR recognition error:', err);
      return null;
    } finally {
      this.isBusy = false;
    }
  }

  public async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
}

export const ocrService = new OcrService();
