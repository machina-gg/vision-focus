import React, { useCallback, useState, useRef } from 'react';

import { Upload, X, Image as ImageIcon } from 'lucide-react';

import { trackFeatureUse, trackError } from '~/lib/analytics';
import { getMessage } from '~/lib/i18n';
import { IMAGE_LIMITS } from '~/constants/limits';
import {
  compressImage,
  ImageError,
  validateImageFile,
  type ImageErrorCode
} from '~/lib/image';

/** ImageUploader に渡す現在の画像と変更の受け取り先 */
export interface ImageUploaderProps {
  /** 設定済みの画像のデータ URL（null なら未設定としてアップロード欄を出す） */
  value: string | null;
  /** 圧縮した画像のデータ URL を受け取る。削除されたときは null */
  onChange: (dataUrl: string | null) => void;
  /** 圧縮後の上限サイズ（MB。省略時は 1） */
  maxSizeMB?: number;
  /** true なら選択・ドロップ・削除をできなくする */
  disabled?: boolean;
}

const BYTES_PER_MB = 1024 * 1024;

function imageErrorText(code: ImageErrorCode, maxSizeMB: number): string {
  switch (code) {
    case 'unsupported-type':
      return getMessage('imageErrorUnsupportedType');
    case 'file-too-large':
      return getMessage(
        'imageErrorTooLarge',
        String(IMAGE_LIMITS.MAX_FILE_SIZE / BYTES_PER_MB)
      );
    case 'not-compressible':
      return getMessage('imageErrorNotCompressible', String(maxSizeMB));
    case 'process-failed':
      return getMessage('imageErrorProcessFailed');
  }
}

/**
 * 背景画像をクリックかドロップで選ばせて圧縮し、設定済みならそのプレビューと削除ボタンを表示する
 * @param props 現在の画像と変更の受け取り先（各フィールドは ImageUploaderProps）
 * @returns アップロード欄とエラー文、または設定済み画像のプレビュー
 */
export function ImageUploader({
  value,
  onChange,
  maxSizeMB = 1,
  disabled = false
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      const invalid = validateImageFile(file);
      if (invalid) {
        setError(imageErrorText(invalid, maxSizeMB));
        return;
      }

      setIsProcessing(true);
      try {
        const dataUrl = await compressImage(file, maxSizeMB);
        onChange(dataUrl);
        trackFeatureUse('image_upload');
      } catch (err) {
        trackError('image_upload_failed');
        setError(
          imageErrorText(
            err instanceof ImageError ? err.code : 'process-failed',
            maxSizeMB
          )
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [maxSizeMB, onChange]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // 空に戻さないと、同じファイルを選び直したときに change が発火しない
      e.target.value = '';
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setError(null);
  }, [onChange]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  if (value) {
    return (
      <div className="relative">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
          <img
            src={value}
            alt="Uploaded background"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              title={getMessage('remove')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 text-center">
          {getMessage('uploadedImage')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        data-testid="style-bg-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <div
        data-testid="style-bg-upload-dropzone"
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative w-full aspect-video rounded-lg border-2 border-dashed
          flex flex-col items-center justify-center gap-2
          transition-colors cursor-pointer
          ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isProcessing ? 'pointer-events-none' : ''}
        `}
      >
        {isProcessing ? (
          <>
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">{getMessage('processing')}</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-gray-100 rounded-full">
              {isDragging ? (
                <ImageIcon className="w-6 h-6 text-primary-500" />
              ) : (
                <Upload className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {isDragging
                  ? getMessage('dropImage')
                  : getMessage('uploadImage')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getMessage('supportedFormats')}
              </p>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-danger-500 text-center">{error}</p>}
    </div>
  );
}
