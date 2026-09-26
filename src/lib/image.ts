import { IMAGE_LIMITS } from '~/constants/limits';

/** 画像を背景に使えなかった理由。文言は画面が i18n で決める */
export type ImageErrorCode =
  'unsupported-type' | 'file-too-large' | 'not-compressible' | 'process-failed';

/** 画像の検証・変換の失敗。code で理由を持つ */
export class ImageError extends Error {
  constructor(readonly code: ImageErrorCode) {
    super(code);
    this.name = 'ImageError';
  }
}

/** 背景画像として使える形式・サイズかを確かめ、使えなければ理由を返す（使えるなら null） */
export function validateImageFile(file: File): ImageErrorCode | null {
  if (!file) {
    return 'process-failed';
  }

  if (
    !IMAGE_LIMITS.SUPPORTED_TYPES.includes(
      file.type as (typeof IMAGE_LIMITS.SUPPORTED_TYPES)[number]
    )
  ) {
    return 'unsupported-type';
  }

  if (file.size > IMAGE_LIMITS.MAX_FILE_SIZE) {
    return 'file-too-large';
  }

  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageError('process-failed'));

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new ImageError('process-failed'));
    reader.readAsDataURL(file);
  });
}

function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let newWidth = width;
  let newHeight = height;

  if (width > maxWidth) {
    newWidth = maxWidth;
    newHeight = (height * maxWidth) / width;
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = (width * maxHeight) / height;
  }

  return { width: Math.round(newWidth), height: Math.round(newHeight) };
}

/** 画像を上限の縦横に縮めて JPEG の data URL にする（失敗は ImageError で投げる） */
export async function compressImage(
  file: File,
  maxSizeMB: number = IMAGE_LIMITS.TARGET_SIZE / 1024 / 1024
): Promise<string> {
  const invalid = validateImageFile(file);
  if (invalid) {
    throw new ImageError(invalid);
  }

  const img = await loadImage(file);
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    IMAGE_LIMITS.MAX_WIDTH,
    IMAGE_LIMITS.MAX_HEIGHT
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new ImageError('process-failed');
  }

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const targetSize = maxSizeMB * 1024 * 1024;
  let quality = 0.9;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  while (dataUrl.length > targetSize && quality > 0.1) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  if (dataUrl.length > targetSize) {
    throw new ImageError('not-compressible');
  }

  return dataUrl;
}

/** data URL の中身のバイト数（base64 を復号した後の大きさ） */
export function getBase64Size(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1];
  if (!base64) return 0;

  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** バイト数を B / KB / MB の表示にする */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
