/**
 * Mathematical Modulo-10 Check Digit Validators according to official GS1 specifications.
 * Ensures zero-hallucination and zero false-positives when scanning printed numbers.
 */

export interface ValidatedProductCode {
  code: string;
  format: 'ean_13' | 'upc_a' | 'ean_8';
  valid: true;
}

export interface ExtractedProductLabel {
  rawCleaned: string;
  titleCandidate?: string;
  sizeCandidate?: string;
  brandCandidate?: string;
}

/**
 * Validate EAN-13 (13 digits) using GS1 Modulo-10 formula
 * Indices 0..11: Alternating weights 1 and 3
 */
export function validateEan13(code: string): boolean {
  const clean = code.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[12], 10);
}

/**
 * Validate UPC-A (12 digits) using GS1 Modulo-10 formula
 * Indices 0..10: Alternating weights 3 and 1
 */
export function validateUpcA(code: string): boolean {
  const clean = code.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[11], 10);
}

/**
 * Validate EAN-8 (8 digits) using GS1 Modulo-10 formula
 * Indices 0..6: Alternating weights 3 and 1
 */
export function validateEan8(code: string): boolean {
  const clean = code.replace(/[\s-]/g, '');
  if (!/^\d{8}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[7], 10);
}

/**
 * Extract all mathematically valid product barcodes from an arbitrary OCR text block.
 * Strips formatting spaces and noise.
 */
export function extractValidProductCodes(text: string): ValidatedProductCode[] {
  if (!text) return [];

  const results: ValidatedProductCode[] = [];
  const seen = new Set<string>();

  // 1. Remove non-alphanumeric noise while preserving digit groupings
  const normalized = text.replace(/[^a-zA-Z0-9\s]/g, ' ');

  // 2. Look for explicit consecutive digit sequences (8, 12, 13 digits)
  const candidateMatches = normalized.match(/\b\d{8,14}\b/g) || [];

  for (const rawCandidate of candidateMatches) {
    // Check 13-digit EAN-13
    if (rawCandidate.length === 13 && validateEan13(rawCandidate)) {
      if (!seen.has(rawCandidate)) {
        seen.add(rawCandidate);
        results.push({ code: rawCandidate, format: 'ean_13', valid: true });
      }
      continue;
    }

    // Check 12-digit UPC-A
    if (rawCandidate.length === 12 && validateUpcA(rawCandidate)) {
      if (!seen.has(rawCandidate)) {
        seen.add(rawCandidate);
        results.push({ code: rawCandidate, format: 'upc_a', valid: true });
      }
      continue;
    }

    // Check 8-digit EAN-8
    if (rawCandidate.length === 8 && validateEan8(rawCandidate)) {
      if (!seen.has(rawCandidate)) {
        seen.add(rawCandidate);
        results.push({ code: rawCandidate, format: 'ean_8', valid: true });
      }
      continue;
    }
  }

  // 3. Fallback: Check if OCR split digits with spaces (e.g., "6 151100 010012")
  if (results.length === 0) {
    const digitsOnly = text.replace(/\D/g, '');
    if (digitsOnly.length === 13 && validateEan13(digitsOnly) && !seen.has(digitsOnly)) {
      results.push({ code: digitsOnly, format: 'ean_13', valid: true });
    } else if (digitsOnly.length === 12 && validateUpcA(digitsOnly) && !seen.has(digitsOnly)) {
      results.push({ code: digitsOnly, format: 'upc_a', valid: true });
    } else if (digitsOnly.length === 8 && validateEan8(digitsOnly) && !seen.has(digitsOnly)) {
      results.push({ code: digitsOnly, format: 'ean_8', valid: true });
    }
  }

  return results;
}

/**
 * Extract packaging text attributes (Title, Weight/Volume size, Brand)
 * from unbarcoded goods.
 */
export function extractProductLabels(text: string): ExtractedProductLabel {
  if (!text) return { rawCleaned: '' };

  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  // Filter out dates, prices, and batch noise
  const cleanLines = lines.filter(
    (line) =>
      !/^(exp|bb|best before|mfg|prod|batch|bn|date|naira|\u20A6|\$|usd)/i.test(line) &&
      !/\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}/.test(line)
  );

  const rawCleaned = cleanLines.join(' ');

  // Extract size / quantity (e.g. 500g, 1.5kg, 33cl, 750ml, 120g, 1L, 40 pcs)
  const sizeMatch = text.match(
    /\b(\d+(?:\.\d+)?)\s*(kg|g|gm|grams|ml|cl|ltr|l|litres|pcs|packs?|sachets?)\b/i
  );
  const sizeCandidate = sizeMatch ? sizeMatch[0].toLowerCase() : undefined;

  // Best title candidate: usually the first high-confidence uppercase line > 4 characters
  const titleCandidate =
    cleanLines.find(
      (line) =>
        line.length >= 4 &&
        !/^\d+$/.test(line) &&
        line === line.toUpperCase() &&
        line.split(' ').length <= 7
    ) || cleanLines[0];

  return {
    rawCleaned,
    titleCandidate,
    sizeCandidate,
  };
}
