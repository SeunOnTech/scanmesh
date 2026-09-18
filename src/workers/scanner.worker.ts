/// <reference lib="webworker" />
import { BarcodeDetector as PolyfillBarcodeDetector } from 'barcode-detector';
import type { BarcodeFormat, WorkerInMessage, WorkerOutMessage } from '../core/types';

interface DetectedBarcode {
  rawValue: string;
  format: string;
  cornerPoints?: { x: number; y: number }[];
}

interface DetectorInstance {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

let detector: DetectorInstance | null = null;
let activeEngine: 'Native BarcodeDetector' | 'Polyfill Engine' = 'Polyfill Engine';

const DEFAULT_FORMATS: BarcodeFormat[] = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'qr_code',
  'data_matrix',
];

async function initDetector(requestedFormats: BarcodeFormat[] = DEFAULT_FORMATS) {
  const formatsToUse = requestedFormats.length > 0 ? requestedFormats : DEFAULT_FORMATS;

  try {
    // Check if native BarcodeDetector is available in worker context
    const NativeDetector = (globalThis as unknown as { BarcodeDetector?: new (options?: { formats: string[] }) => DetectorInstance }).BarcodeDetector;

    if (typeof NativeDetector === 'function') {
      try {
        detector = new NativeDetector({ formats: formatsToUse });
        activeEngine = 'Native BarcodeDetector';
      } catch {
        // Native detector failed initialization (format incompatibility), fallback to polyfill
        detector = new PolyfillBarcodeDetector({ formats: formatsToUse as unknown as import('barcode-detector').BarcodeFormat[] }) as unknown as DetectorInstance;
        activeEngine = 'Polyfill Engine';
      }
    } else {
      // Use high-performance Wasm/JS polyfill
      detector = new PolyfillBarcodeDetector({ formats: formatsToUse as unknown as import('barcode-detector').BarcodeFormat[] }) as unknown as DetectorInstance;
      activeEngine = 'Polyfill Engine';
    }

    const response: WorkerOutMessage = {
      type: 'INIT_SUCCESS',
      engine: activeEngine,
    };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerOutMessage = {
      type: 'ERROR',
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
}

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (msg.type === 'INIT') {
    await initDetector(msg.formats);
    return;
  }

  if (msg.type === 'DETECT_FRAME') {
    const { bitmap, timestamp } = msg;

    if (!detector) {
      await initDetector();
    }

    const start = performance.now();

    try {
      if (!detector) {
        throw new Error('Detector engine failed to initialize');
      }

      const results = await detector.detect(bitmap);
      const latencyMs = performance.now() - start;

      // Always close ImageBitmap immediately to prevent memory leaks on mobile
      bitmap.close();

      if (results && results.length > 0) {
        const top = results[0];
        const response: WorkerOutMessage = {
          type: 'FRAME_RESULT',
          success: true,
          result: {
            rawValue: top.rawValue,
            format: top.format,
            cornerPoints: top.cornerPoints,
          },
          latencyMs,
          timestamp,
        };
        self.postMessage(response);
      } else {
        const response: WorkerOutMessage = {
          type: 'FRAME_RESULT',
          success: false,
          latencyMs,
          timestamp,
        };
        self.postMessage(response);
      }
    } catch (err) {
      bitmap.close();
      const latencyMs = performance.now() - start;
      const response: WorkerOutMessage = {
        type: 'FRAME_RESULT',
        success: false,
        latencyMs,
        timestamp,
      };
      self.postMessage(response);
    }
  }
};
