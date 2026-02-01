/**
 * Wallpaper capture and download utilities using html2canvas
 */

import html2canvas from 'html2canvas';

export type Resolution = '1080p' | '1440p' | '4k';

export interface CaptureOptions {
  resolution: Resolution;
  quality?: number; // 0-1 for JPEG quality
}

// Resolution presets
const RESOLUTIONS: Record<Resolution, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4k': { width: 3840, height: 2160 }
};

/**
 * Capture an element as a canvas
 */
async function captureElement(
  element: HTMLElement,
  options: CaptureOptions
): Promise<HTMLCanvasElement> {
  const { width, height } = RESOLUTIONS[options.resolution];

  // Get the element's current dimensions
  const rect = element.getBoundingClientRect();
  const scale = Math.max(width / rect.width, height / rect.height);

  const canvas = await html2canvas(element, {
    scale,
    width: rect.width,
    height: rect.height,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false
  });

  // Create a new canvas with the target resolution
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;

  const ctx = outputCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Fill with black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Calculate centering
  const _scaledWidth = canvas.width * (width / canvas.width);
  const _scaledHeight = canvas.height * (height / canvas.height);
  const useScale = Math.min(width / canvas.width, height / canvas.height);
  const finalWidth = canvas.width * useScale;
  const finalHeight = canvas.height * useScale;
  const offsetX = (width - finalWidth) / 2;
  const offsetY = (height - finalHeight) / 2;

  // Draw the captured canvas centered
  ctx.drawImage(canvas, offsetX, offsetY, finalWidth, finalHeight);

  return outputCanvas;
}

/**
 * Capture an element as a Blob
 */
export async function captureWallpaper(
  element: HTMLElement,
  options: CaptureOptions = { resolution: '1080p', quality: 0.95 }
): Promise<Blob> {
  const canvas = await captureElement(element, options);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/png',
      options.quality
    );
  });
}

/**
 * Capture and download wallpaper
 */
export async function downloadWallpaper(
  element: HTMLElement,
  filename: string = 'visionfocus-wallpaper',
  options: CaptureOptions = { resolution: '1080p', quality: 0.95 }
): Promise<void> {
  const blob = await captureWallpaper(element, options);
  const { width, height } = RESOLUTIONS[options.resolution];

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${width}x${height}.png`;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Get available resolutions with labels
 */
export function getResolutionOptions(): {
  value: Resolution;
  label: string;
  dimensions: string;
}[] {
  return [
    { value: '1080p', label: 'Full HD', dimensions: '1920 x 1080' },
    { value: '1440p', label: 'Quad HD', dimensions: '2560 x 1440' },
    { value: '4k', label: '4K Ultra HD', dimensions: '3840 x 2160' }
  ];
}

/**
 * Get resolution dimensions
 */
export function getResolutionDimensions(resolution: Resolution): {
  width: number;
  height: number;
} {
  return RESOLUTIONS[resolution];
}
