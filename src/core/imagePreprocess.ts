export interface PreprocessOptions {
  sharpen?: boolean;
  contrastBoost?: boolean;
  targetWidth?: number;
  invert?: boolean;
}

export function enhancePackagingContrast(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
  options?: PreprocessOptions
): HTMLCanvasElement {
  const srcWidth = sourceCanvas.width;
  const srcHeight = sourceCanvas.height;

  const targetW = options?.targetWidth || Math.max(900, srcWidth);
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

  for (let i = 0; i < len; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    hist[lum]++;
  }

  const totalPixels = targetW * targetH;
  const p4Count = Math.floor(totalPixels * 0.04);
  const p96Count = Math.floor(totalPixels * 0.96);

  let accumulated = 0;
  let minLum = 0;
  let maxLum = 255;

  for (let i = 0; i < 256; i++) {
    accumulated += hist[i];
    if (accumulated >= p4Count && minLum === 0) {
      minLum = i;
    }
    if (accumulated >= p96Count) {
      maxLum = i;
      break;
    }
  }

  const range = Math.max(25, maxLum - minLum);
  const doInvert = options?.invert === true;

  for (let i = 0; i < len; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    let stretched = ((lum - minLum) * 255) / range;
    stretched = Math.min(255, Math.max(0, stretched));

    if (doInvert) {
      stretched = 255 - stretched;
    }

    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }

  ctx.putImageData(imgData, 0, 0);

  if (options?.sharpen !== false) {
    ctx.filter = 'contrast(1.22) brightness(1.02)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  }

  return canvas;
}

export function invertCanvas(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(sourceCanvas as CanvasImageSource, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export function applyLocalAdaptiveThreshold(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
  windowSize = 25,
  percentage = 12
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(sourceCanvas as CanvasImageSource, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
  }

  const integral = new Uint32Array(width * height);
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const yOffset = y * width;
    for (let x = 0; x < width; x++) {
      rowSum += gray[yOffset + x];
      if (y === 0) {
        integral[x] = rowSum;
      } else {
        integral[yOffset + x] = integral[yOffset - width + x] + rowSum;
      }
    }
  }

  const s2 = Math.floor(windowSize / 2);
  const factor = (100 - percentage) / 100;

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - s2);
    const y2 = Math.min(height - 1, y + s2);
    const yOffset = y * width;

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - s2);
      const x2 = Math.min(width - 1, x + s2);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      const sum =
        integral[y2 * width + x2] -
        (x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0) -
        (y1 > 0 ? integral[(y1 - 1) * width + x2] : 0) +
        (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * width + (x1 - 1)] : 0);

      const threshold = (sum / count) * factor;
      const pixelVal = gray[yOffset + x] < threshold ? 0 : 255;
      const idx = (yOffset + x) * 4;

      data[idx] = pixelVal;
      data[idx + 1] = pixelVal;
      data[idx + 2] = pixelVal;
    }
  }

  ctx.putImageData(imgData, 0, 0);
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
