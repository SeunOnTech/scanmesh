export type BarcodeFormat =
  | 'ean_13'
  | 'ean_8'
  | 'upc_a'
  | 'upc_e'
  | 'code_128'
  | 'code_39'
  | 'qr_code'
  | 'data_matrix';

export interface Point {
  x: number;
  y: number;
}

export type DetectionSource =
  | 'HARDWARE_BARCODE'
  | 'MICRO_OCR_DIGITS'
  | 'PACKAGING_OCR_TEXT';

export interface ProductMetadata {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  size?: string;
  suggestedRetailPrice: number;
  costPrice?: number;
  imageUrl?: string;
  isMasterVerified: boolean;
}

export interface StockedItem {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  size?: string;
  sellingPrice: number;
  quantity: number;
  stockedAt: number;
}

export interface ScanResult {
  rawValue: string;
  format: BarcodeFormat | string;
  source: DetectionSource;
  modulo10Validated?: boolean;
  product?: ProductMetadata;
  ocrText?: string;
  extractedLabel?: {
    title?: string;
    size?: string;
  };
  cornerPoints?: Point[];
  timestamp: number;
  latencyMs: number;
}

export interface TelemetryStats {
  fps: number;
  lastLatencyMs: number;
  avgLatencyMs: number;
  framesProcessed: number;
  engine: 'Native BarcodeDetector' | 'Polyfill Engine' | 'Neural Micro-OCR' | 'Unified Hybrid' | 'Idle';
  activeFormat?: string;
  isScanning: boolean;
  ocrConfidence?: number;
  ocrStatus?: 'idle' | 'processing' | 'ready';
  ocrEngineStatus?: string;
}

export interface ScannerConfig {
  formats: BarcodeFormat[];
  roiSize: number; // e.g. 260px square
  targetFps: number; // e.g. 30
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

export type WorkerInMessage =
  | {
      type: 'INIT';
      formats: BarcodeFormat[];
    }
  | {
      type: 'DETECT_FRAME';
      bitmap: ImageBitmap;
      timestamp: number;
    };

export type WorkerOutMessage =
  | {
      type: 'INIT_SUCCESS';
      engine: 'Native BarcodeDetector' | 'Polyfill Engine';
    }
  | {
      type: 'FRAME_RESULT';
      success: boolean;
      result?: {
        rawValue: string;
        format: string;
        cornerPoints?: Point[];
      };
      latencyMs: number;
      timestamp: number;
    }
  | {
      type: 'ERROR';
      error: string;
    };
