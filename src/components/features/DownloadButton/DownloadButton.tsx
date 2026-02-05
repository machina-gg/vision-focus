import React, { useState, useRef } from 'react';

import { Download, Check, X, ChevronDown } from 'lucide-react';

import {
  downloadWallpaper,
  type Resolution,
  getResolutionOptions
} from '~/lib/wallpaper';
import { getMessage } from '~/lib/i18n';

export interface DownloadButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  disabled?: boolean;
  className?: string;
}

export function DownloadButton({
  targetRef,
  disabled = false,
  className = ''
}: DownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const menuRef = useRef<HTMLDivElement>(null);

  const resolutions = getResolutionOptions();

  const handleDownload = async (resolution: Resolution) => {
    if (!targetRef.current || isDownloading) return;

    setIsDownloading(true);
    setDownloadStatus('idle');
    setIsOpen(false);

    try {
      await downloadWallpaper(targetRef.current, 'visionfocus-wallpaper', {
        resolution,
        quality: 0.95
      });
      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus('idle'), 2000);
    } catch {
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 2000);
    } finally {
      setIsDownloading(false);
    }
  };

  const getButtonIcon = () => {
    if (isDownloading) {
      return (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      );
    }
    if (downloadStatus === 'success') {
      return <Check className="w-5 h-5" />;
    }
    if (downloadStatus === 'error') {
      return <X className="w-5 h-5" />;
    }
    return <Download className="w-5 h-5" />;
  };

  const getButtonColor = () => {
    if (downloadStatus === 'success') return 'bg-green-500 hover:bg-green-600';
    if (downloadStatus === 'error') return 'bg-red-500 hover:bg-red-600';
    return 'bg-black/50 hover:bg-black/70';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isDownloading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-white
          transition-all shadow-lg backdrop-blur-xs
          ${getButtonColor()}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={getMessage('downloadWallpaper')}
      >
        {getButtonIcon()}
        <span className="text-sm font-medium">{getMessage('download')}</span>
        {!isDownloading && downloadStatus === 'idle' && (
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Resolution Menu - excluded from wallpaper capture */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            data-html2canvas-ignore="true"
          />

          {/* Menu */}
          <div
            ref={menuRef}
            className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
            data-html2canvas-ignore="true"
          >
            <div className="p-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase">
                {getMessage('selectResolution')}
              </p>
            </div>
            {resolutions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleDownload(option.value)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-500">{option.dimensions}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
