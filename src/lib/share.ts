// Share utilities for X (Twitter) sharing

import { formatTime } from './time';

/**
 * Generate share text for analytics data
 */
export function generateShareText(data: {
  totalBlockCount: number;
  totalWasteTime: number;
  wasteTimeChangePercent?: number | null;
  topBlockedSite?: string;
}): string {
  const {
    totalBlockCount,
    totalWasteTime,
    wasteTimeChangePercent,
    topBlockedSite
  } = data;

  const lines: string[] = [];

  // Header
  lines.push('📊 VisionFocus Report');
  lines.push('');

  // Stats
  if (totalBlockCount > 0) {
    lines.push(`🚫 Blocked: ${totalBlockCount} times`);
  }

  if (totalWasteTime > 0) {
    lines.push(`⏰ Waste Time: ${formatTime(totalWasteTime)}`);
  }

  if (wasteTimeChangePercent !== undefined && wasteTimeChangePercent !== null) {
    const sign = wasteTimeChangePercent > 0 ? '+' : '';
    lines.push(`📈 vs Previous: ${sign}${wasteTimeChangePercent.toFixed(1)}%`);
  }

  if (topBlockedSite) {
    lines.push(`🔒 Top Blocked: ${topBlockedSite}`);
  }

  lines.push('');
  lines.push('#VisionFocus #productivity');

  return lines.join('\n');
}

/**
 * Open X (Twitter) intent with pre-filled text
 */
export function shareToX(text: string): void {
  const encodedText = encodeURIComponent(text);
  const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Copy image to clipboard from canvas element
 */
export async function copyImageToClipboard(
  canvas: HTMLCanvasElement
): Promise<boolean> {
  try {
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        1.0
      );
    });

    if (!blob) {
      console.error('Blob creation failed: blob is null');
      return false;
    }

    // Check if clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.write) {
      console.error('Clipboard API not available');
      return false;
    }

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

    return true;
  } catch (error) {
    console.error('Failed to copy image to clipboard:', error);
    return false;
  }
}

/**
 * Download image from canvas element
 */
export function downloadImage(
  canvas: HTMLCanvasElement,
  filename: string
): void {
  try {
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to download image:', error);
    throw error;
  }
}

/**
 * Capture DOM element as canvas using html2canvas
 * Note: Handles SVG elements from Recharts
 */
export async function captureElementAsCanvas(
  element: HTMLElement
): Promise<HTMLCanvasElement | null> {
  try {
    // Dynamically import html2canvas
    const html2canvas = (await import('html2canvas')).default;

    // Wait a brief moment to ensure all elements are rendered
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true, // Better support for complex elements
      onclone: (clonedDoc) => {
        // Ensure SVG elements are properly sized in the clone
        const svgs = clonedDoc.querySelectorAll('svg');
        svgs.forEach((svg) => {
          const bbox = svg.getBoundingClientRect();
          if (bbox.width > 0 && bbox.height > 0) {
            svg.setAttribute('width', String(bbox.width));
            svg.setAttribute('height', String(bbox.height));
          }
        });
      }
    });

    // Validate canvas was created with content
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      console.error('Canvas creation failed: invalid dimensions', {
        width: canvas?.width,
        height: canvas?.height
      });
      return null;
    }

    return canvas;
  } catch (error) {
    console.error('Failed to capture element as canvas:', error);
    return null;
  }
}
