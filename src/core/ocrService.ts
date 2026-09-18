import { createWorker, PSM, type Worker } from 'tesseract.js';

export type OcrStatus = 'uninitialized' | 'loading' | 'ready' | 'processing' | 'error';

export interface OcrRecognitionResult {
  text: string;
  lines: string[];
  confidence: number;
  latencyMs: number;
  wordCount: number;
}

export type OcrStatusListener = (status: OcrStatus, progress: number) => void;

const KNOWN_ABBREVIATIONS = new Set([
  'LTD', 'PLC', 'LLC', 'INC', 'MFG', 'EXP', 'BN', 'PROD',
  'NET', 'WT', 'QTY', 'PCS', 'VOL', 'MAX', 'MIN', 'REG',
  'NAFDAC', 'SON', 'ISO', 'FDA', 'CE', 'UK', 'US', 'NG',
  'KGS', 'KG', 'GMS', 'GM', 'GR', 'MLS', 'ML', 'LTR', 'CL', 'OZ', 'MG'
]);

function isValidWord(rawText: string, confidence: number): boolean {
  const cleaned = rawText.replace(/^[^\w]+|[^\w]+$/g, '');
  if (!cleaned) return false;

  const minConfidence = cleaned.length <= 2 ? 72 : 58;
  if (confidence < minConfidence) return false;

  if (cleaned.length === 1) {
    return /^[AI0-9]$/i.test(cleaned) && confidence >= 80;
  }

  if (/^[\d.,%-]+$/.test(cleaned)) {
    return /\d/.test(cleaned) && confidence >= 60;
  }

  const alphaOnly = cleaned.replace(/[^a-zA-Z]/g, '');
  if (alphaOnly.length >= 4) {
    const upper = alphaOnly.toUpperCase();
    if (!/[AEIOUY]/.test(upper) && !KNOWN_ABBREVIATIONS.has(upper)) {
      return false;
    }
  }

  if (/(.)\1{3,}/.test(cleaned)) {
    return false;
  }

  return true;
}

function cleanWordText(rawText: string): string {
  return rawText.replace(/^[^\w(]+|[^\w).]+$/g, '').trim();
}

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
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
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

      interface ScannedWord {
        text: string;
        confidence: number;
      }
      interface ScannedLine {
        words: ScannedWord[];
      }

      const scannedLines: ScannedLine[] = [];

      if (data.blocks && Array.isArray(data.blocks)) {
        for (const block of data.blocks) {
          if (block.paragraphs) {
            for (const para of block.paragraphs) {
              if (para.lines) {
                for (const line of para.lines) {
                  scannedLines.push({
                    words: (line.words || []).map((w) => ({
                      text: w.text || '',
                      confidence: typeof w.confidence === 'number' ? w.confidence : 0,
                    })),
                  });
                }
              }
            }
          }
        }
      }

      if (scannedLines.length === 0 && data.text) {
        const textLines = data.text.split(/[\r\n]+/);
        for (const tl of textLines) {
          const words = tl.trim().split(/\s+/).filter(Boolean);
          if (words.length > 0) {
            scannedLines.push({
              words: words.map((w) => ({
                text: w,
                confidence: typeof data.confidence === 'number' ? data.confidence : 75,
              })),
            });
          }
        }
      }

      const validLines: string[] = [];
      let totalConfidence = 0;
      let totalValidWords = 0;
      let totalCharCount = 0;

      for (const line of scannedLines) {
        const passingWords: string[] = [];

        for (const w of line.words) {
          if (isValidWord(w.text, w.confidence)) {
            const cleaned = cleanWordText(w.text);
            if (cleaned) {
              passingWords.push(cleaned);
              totalConfidence += w.confidence;
              totalValidWords++;
              totalCharCount += cleaned.length;
            }
          }
        }

        if (passingWords.length > 0) {
          validLines.push(passingWords.join(' '));
        }
      }

      if (totalValidWords === 0 || totalCharCount < 4 || validLines.length === 0) {
        return null;
      }

      const avgConfidence = Math.round(totalConfidence / totalValidWords);
      if (avgConfidence < 62) {
        return null;
      }

      const fullText = validLines.join('\n');

      return {
        text: fullText,
        lines: validLines,
        confidence: avgConfidence,
        latencyMs,
        wordCount: totalValidWords,
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
