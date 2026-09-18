import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  Volume2,
  RefreshCw,
  Barcode,
  ScanText,
  ShieldCheck,
  Tag,
  PackagePlus,
  Sparkles,
} from 'lucide-react';
import type { ScanResult, StockedItem } from '../core/types';
import { soundEngine } from '../core/audio';
import { triggerHaptic } from '../core/haptics';

interface ScanResultCardProps {
  result: ScanResult;
  onReset: () => void;
  onStockItem: (item: StockedItem) => void;
}

export const ScanResultCard: React.FC<ScanResultCardProps> = ({
  result,
  onReset,
  onStockItem,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isStocked, setIsStocked] = useState<boolean>(false);

  const initialPrice = result.product?.suggestedRetailPrice || 500;
  const initialTitle =
    result.product?.name ||
    result.extractedLabel?.title ||
    (result.format === 'PACKAGING_TEXT'
      ? result.rawValue
      : `SKU Item ${result.rawValue}`);

  const [sellingPrice, setSellingPrice] = useState<number>(initialPrice);
  const [quantity, setQuantity] = useState<number>(12);
  const [customTitle, setCustomTitle] = useState<string>(initialTitle);

  useEffect(() => {
    setIsStocked(false);
    setSellingPrice(result.product?.suggestedRetailPrice || 500);
    setQuantity(12);
    setCustomTitle(
      result.product?.name ||
        result.extractedLabel?.title ||
        (result.format === 'PACKAGING_TEXT'
          ? result.rawValue
          : `SKU Item ${result.rawValue}`)
    );
  }, [result]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.rawValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleStock = () => {
    const item: StockedItem = {
      id: `${result.rawValue}-${Date.now()}`,
      barcode: result.rawValue,
      name: customTitle,
      brand: result.product?.brand || 'General FMCG',
      category: result.product?.category || 'Retail Inventory',
      size: result.product?.size || result.extractedLabel?.size,
      sellingPrice,
      quantity,
      stockedAt: Date.now(),
    };

    soundEngine.playSuccessBeep();
    triggerHaptic('success');
    onStockItem(item);
    setIsStocked(true);
  };

  const adjustQty = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const getSourceBadge = () => {
    switch (result.source) {
      case 'HARDWARE_BARCODE':
        return {
          label: 'Hardware Barcode',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <Barcode className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'MICRO_OCR_DIGITS':
        return {
          label: 'Micro-OCR Digits',
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          icon: <ScanText className="w-3.5 h-3.5 text-cyan-400" />,
        };
      case 'PACKAGING_OCR_TEXT':
        return {
          label: 'Packaging Text Match',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <Tag className="w-3.5 h-3.5 text-amber-400" />,
        };
    }
  };

  const sourceBadge = getSourceBadge();
  const isCatalogMatched = Boolean(result.product);

  return (
    <div className="w-full bg-gray-900/95 border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            {sourceBadge.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-white">
                {isCatalogMatched ? 'Master FMCG Verified' : 'Scanned Target Acquired'}
              </h4>
              {result.modulo10Validated && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Modulo-10
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400">{sourceBadge.label}</span>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border uppercase ${sourceBadge.color}`}>
          {result.format.replace('_', '-')}
        </span>
      </div>

      <div className="bg-gray-950/90 border border-gray-800 rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {isCatalogMatched ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {result.product?.brand}
                  </span>
                  <span className="text-xs text-gray-400">
                    {result.product?.category}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                  {result.product?.name}
                </h3>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Custom SKU
                  </span>
                  <span className="text-xs text-gray-400">Store Onboarding</span>
                </div>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full text-lg sm:text-xl font-bold text-white bg-transparent border-b border-gray-700 focus:border-emerald-400 focus:outline-none pb-1"
                  placeholder="Enter Product Name..."
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1 text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                <Barcode className="w-3 h-3 text-gray-400" />
                {result.rawValue}
              </span>
              {(result.product?.size || result.extractedLabel?.size) && (
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                  Unit: {(result.product?.size || result.extractedLabel?.size)?.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => soundEngine.playSuccessBeep()}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 transition-colors"
              title="Play Chime"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-emerald-400 border border-gray-800 transition-colors flex items-center gap-1"
              title="Copy Code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {!isStocked ? (
        <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-gray-300 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Point & Stock: Price & Quantity
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-mono text-gray-400 mb-1 block">
                SELLING PRICE (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 font-bold font-mono">
                  ₦
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white font-bold font-mono text-base focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-gray-400 mb-1 block">
                QUANTITY IN STOCK
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white font-bold font-mono text-base focus:border-emerald-400 focus:outline-none text-center"
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustQty(1)}
                    className="px-2.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono text-xs rounded-lg font-bold"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => adjustQty(5)}
                    className="px-2.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono text-xs rounded-lg font-bold"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => adjustQty(12)}
                    className="px-2.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono text-xs rounded-lg font-bold"
                  >
                    +12
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleStock}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <PackagePlus className="w-4 h-4" />
            Add to Store Inventory
          </button>
        </div>
      ) : (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 mb-4 text-center animate-in fade-in duration-200">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
            <Check className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-white">Item Successfully Stocked!</h4>
          <p className="text-xs text-emerald-300 mt-0.5">
            {quantity}x {customTitle} at ₦{sellingPrice.toLocaleString()} added to live inventory.
          </p>
        </div>
      )}

      {result.ocrText && (
        <div className="bg-gray-950/60 border border-gray-800/60 rounded-lg p-2 mb-3 text-[11px] font-mono text-gray-400 truncate">
          <span className="text-cyan-400 font-semibold">Vision Buffer: </span>
          <span>{result.ocrText}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 font-mono border-t border-gray-800/80 pt-3">
        <div>
          <span>Engine Latency: </span>
          <strong className="text-emerald-400">{Math.round(result.latencyMs * 10) / 10}ms</strong>
        </div>

        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-sans text-xs font-semibold rounded-xl transition-all border border-gray-700 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Scan Next Product
        </button>
      </div>
    </div>
  );
};
