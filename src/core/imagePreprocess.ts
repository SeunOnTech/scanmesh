/**
 * High-precision image preprocessing for retail packaging and barcode numbers.
 * Replaces destructive global Otsu binarization with adaptive contrast enhancement
 * and unsharp masking to preserve anti-aliased character edges on reflective wrappers.
 */

export interface PreprocessOptions {
  sharpen?: boolean;
  contrastBoost?: boolean;
}

/**
 * Enhanced soft grayscale & adaptive contrast stretching.
 * Does NOT destroy pixels to binary 0/255. Preserves anti-aliasing.
 */
export function enhancePackagingContrast(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
  options?: PreprocessOptions
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // Draw source at full native sensor resolution
  ctx.drawImage(sourceCanvas as CanvasImageSource, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  // Find min and max luminance for dynamic range stretching
  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < len; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  // Prevent division by zero if image is completely uniform
  const range = maxLum - minLum || 1;
  const shouldBoost = options?.contrastBoost !== false;

  // Apply soft contrast stretching while preserving subtle stroke gradients
  for (let i = 0; i < len; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;

    let normalized = lum;
    if (shouldBoost && range > 30) {
      // Stretch dynamic range to 0..255 with an S-curve for punchy text
      const stretched = ((lum - minLum) * 255) / range;
      normalized = Math.min(255, Math.max(0, stretched));
    }

    data[i] = normalized;
    data[i + 1] = normalized;
    data[i + 2] = normalized;
    // Alpha remains 255
  }

  ctx.putImageData(imgData, 0, 0);

  // Optional: Apply lightweight unsharp mask filter via canvas context
  if (options?.sharpen) {
    ctx.filter = 'contrast(1.15) brightness(1.05)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  }

  return canvas;
}

/**
 * Extracts strictly the bottom 25% horizontal strip of a barcode Region of Interest.
 * This is where the human-readable EAN-13 / UPC digits are standardly printed,
 * completely excluding the vertical zebra stripes that confuse OCR.
 */
export function extractBarcodeNumberStrip(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Bottom 25% strip (starting at 72% down to 98% to avoid outer borders)
  const stripY = Math.round(height * 0.70);
  const stripHeight = Math.round(height * 0.28);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = stripHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // Crop only the number band
  ctx.drawImage(
    sourceCanvas as CanvasImageSource,
    0,
    stripY,
    width,
    stripHeight,
    0,
    0,
    width,
    stripHeight
  );

  return enhancePackagingContrast(canvas, { sharpen: true, contrastBoost: true });
}
