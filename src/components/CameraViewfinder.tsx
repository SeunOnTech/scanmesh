import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, FlipHorizontal, Zap, ZapOff, AlertCircle, ScanText } from 'lucide-react';
import { BarcodeScannerService } from '../core/BarcodeScanner';
import type { ScanResult, TelemetryStats, ScanMode } from '../core/types';

interface CameraViewfinderProps {
  onDetected: (result: ScanResult) => void;
  onTelemetryUpdate: (stats: TelemetryStats) => void;
  isLocked: boolean;
  mode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  onDetected,
  onTelemetryUpdate,
  isLocked,
  mode,
  onModeChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerServiceRef = useRef<BarcodeScannerService | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    const service = new BarcodeScannerService(
      {
        onDetected,
        onTelemetryUpdate,
        onError: (err) => console.error('Scanner engine error:', err),
      },
      {
        roiSize: 260,
        debounceMs: 1500,
        mode,
      }
    );

    scannerServiceRef.current = service;

    return () => {
      service.destroy();
    };
  }, [onDetected, onTelemetryUpdate]);

  useEffect(() => {
    if (scannerServiceRef.current) {
      scannerServiceRef.current.setMode(mode);
    }
  }, [mode]);

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();

        if (scannerServiceRef.current) {
          scannerServiceRef.current.attachVideo(videoRef.current);
          scannerServiceRef.current.start();
        }
      }

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as { torch?: boolean };
        setHasTorch(Boolean(capabilities?.torch));
      }
    } catch (err) {
      const errorMsg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Unable to access camera. Please check your camera permissions.';
      setCameraError(errorMsg);
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as MediaTrackConstraintSet],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setIsTorchOn(false);
  };

  const isTextMode = mode === 'text';

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[560px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="w-full h-full object-cover"
      />

      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-sm z-20">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-gray-300">Activating Optical Sensor...</p>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/95 p-6 text-center z-30">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Camera Unavailable</h3>
          <p className="text-sm text-gray-400 max-w-sm mb-5">{cameraError}</p>
          <button
            onClick={startCamera}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-colors flex items-center gap-2"
          >
            <Camera className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}

      {!cameraError && !isInitializing && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

          <div
            className={`relative w-[260px] h-[260px] rounded-2xl transition-all duration-300 ${
              isLocked
                ? isTextMode
                  ? 'border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.7)] bg-cyan-500/10'
                  : 'border-2 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.7)] bg-emerald-500/10'
                : 'border border-white/20 bg-transparent'
            }`}
          >
            <div
              className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl transition-colors ${
                isLocked
                  ? isTextMode ? 'border-cyan-400' : 'border-emerald-400'
                  : isTextMode ? 'border-cyan-400' : 'border-emerald-500'
              }`}
            />
            <div
              className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl transition-colors ${
                isLocked
                  ? isTextMode ? 'border-cyan-400' : 'border-emerald-400'
                  : isTextMode ? 'border-cyan-400' : 'border-emerald-500'
              }`}
            />
            <div
              className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl transition-colors ${
                isLocked
                  ? isTextMode ? 'border-cyan-400' : 'border-emerald-400'
                  : isTextMode ? 'border-cyan-400' : 'border-emerald-500'
              }`}
            />
            <div
              className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl transition-colors ${
                isLocked
                  ? isTextMode ? 'border-cyan-400' : 'border-emerald-400'
                  : isTextMode ? 'border-cyan-400' : 'border-emerald-500'
              }`}
            />

            {!isLocked && (
              <div
                className={`absolute left-2 right-2 h-[3px] shadow-[0_0_15px] animate-scanbeam ${
                  isTextMode
                    ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-cyan-400'
                    : 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-emerald-400'
                }`}
              />
            )}

            <div className="absolute -bottom-8 left-0 right-0 text-center">
              <span
                className={`text-xs font-mono tracking-wider px-3 py-1 rounded-full border backdrop-blur-md transition-colors ${
                  isLocked
                    ? isTextMode
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-black/70 text-gray-300 border-white/10'
                }`}
              >
                {isLocked
                  ? isTextMode ? 'TEXT ACQUIRED' : 'TARGET ACQUIRED'
                  : isTextMode ? 'ALIGN PACKAGING TEXT' : 'ALIGN BARCODE OR TEXT'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 flex items-center bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/10 z-10">
        <button
          onClick={() => onModeChange('auto')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            mode === 'auto'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Auto
        </button>
        <button
          onClick={() => onModeChange('text')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            mode === 'text'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ScanText className="w-3.5 h-3.5" />
          Text Focus
        </button>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {hasTorch && (
          <button
            onClick={toggleTorch}
            title="Toggle Flashlight"
            className={`p-2.5 rounded-xl backdrop-blur-md border transition-all ${
              isTorchOn
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-black/50 border-white/10 text-gray-300 hover:bg-black/70'
            }`}
          >
            {isTorchOn ? <Zap className="w-5 h-5 fill-amber-400" /> : <ZapOff className="w-5 h-5" />}
          </button>
        )}

        <button
          onClick={toggleCamera}
          title="Switch Camera"
          className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-gray-300 hover:bg-black/70 backdrop-blur-md transition-all"
        >
          <FlipHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
