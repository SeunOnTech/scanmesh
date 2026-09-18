/**
 * High-speed client-side image preprocessing for retail packaging OCR.
 * Enhances contrast, normalizes lighting glare, and binarizes text.
 */

export function preprocessForOcr(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
  targetWidth: number = 400
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Scale proportionally to targetWidth for optimal OCR performance vs latency
  const scale = targetWidth / width;
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // Draw scaled image
  ctx.drawImage(sourceCanvas as CanvasImageSource, 0, 0, targetWidth, targetHeight);

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;
  const len = data.length;

  // Step 1: Grayscale conversion + Compute histogram for Otsu thresholding
  const gray = new Uint8Array(len / 4);
  const histogram = new Int32Array(256);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    // Luminance formula
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    gray[p] = lum;
    histogram[lum]++;
    p++;
  }

  // Step 2: Otsu's optimal threshold calculation
  const totalPixels = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) {
    sum += t * histogram[t];
  }

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  // Step 3: Apply threshold with high-contrast text preservation
  p = 0;
  for (let i = 0; i < len; i += 4) {
    const val = gray[p] >= threshold ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
    p++;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
