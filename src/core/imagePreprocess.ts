export interface PreprocessOptions {
  sharpen?: boolean;
  contrastBoost?: boolean;
  targetWidth?: number;
  autoInvert?: boolean;
}

export function enhancePackagingContrast(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
  options?: PreprocessOptions
): HTMLCanvasElement {
  const srcWidth = sourceCanvas.width;
  const srcHeight = sourceCanvas.height;

  const targetW = options?.targetWidth || Math.max(800, srcWidth);
  const scale = targetW / srcWidth;
  const targetH = Math.round(srcHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas as CanvasImageSource, 0, 0, targetW, targetH);

  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;
  const len = data.length;

  const hist = new Uint32Array(256);
  let totalBorderLum = 0;
  let borderPixelCount = 0;

  const borderMarginX = Math.max(2, Math.floor(targetW * 0.05));
  const borderMarginY = Math.max(2, Math.floor(targetH * 0.05));

  for (let y = 0; y < targetH; y++) {
    const isBorderY = y < borderMarginY || y >= targetH - borderMarginY;
    const rowOffset = y * targetW * 4;

    for (let x = 0; x < targetW; x++) {
      const idx = rowOffset + x * 4;
      const lum = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
      hist[lum]++;

      if (isBorderY || x < borderMarginX || x >= targetW - borderMarginX) {
        totalBorderLum += lum;
        borderPixelCount++;
      }
    }
  }

  const totalPixels = targetW * targetH;
  const p5Count = Math.floor(totalPixels * 0.04);
  const p95Count = Math.floor(totalPixels * 0.96);

  let accumulated = 0;
  let minLum = 0;
  let maxLum = 255;

  for (let i = 0; i < 256; i++) {
    accumulated += hist[i];
    if (accumulated >= p5Count && minLum === 0) {
      minLum = i;
    }
    if (accumulated >= p95Count) {
      maxLum = i;
      break;
    }
  }

  const range = Math.max(20, maxLum - minLum);
  const avgBorderLum = borderPixelCount > 0 ? totalBorderLum / borderPixelCount : 128;
  const shouldInvert = options?.autoInvert !== false && avgBorderLum < 120;

  for (let i = 0; i < len; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    let stretched = ((lum - minLum) * 255) / range;
    stretched = Math.min(255, Math.max(0, stretched));

    if (shouldInvert) {
      stretched = 255 - stretched;
    }

    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }

  ctx.putImageData(imgData, 0, 0);

  if (options?.sharpen !== false) {
    ctx.filter = 'contrast(1.2) brightness(1.02)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  }

  return canvas;
}

export function extractBarcodeNumberStrip(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const stripY = Math.round(height * 0.70);
  const stripHeight = Math.round(height * 0.28);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = stripHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

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

  return enhancePackagingContrast(canvas, { sharpen: true, contrastBoost: true, targetWidth: 800 });
}
