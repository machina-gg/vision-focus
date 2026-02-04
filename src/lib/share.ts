// Share utilities for X (Twitter) sharing

import { formatTime } from './time';

/**
 * Generate share text for analytics data
 */
export function generateShareText(data: {
  totalBlockCount: number;
  totalWasteTime: number;
  totalInvestTime: number;
  topBlockedSite?: string;
}): string {
  const { totalBlockCount, totalWasteTime, totalInvestTime, topBlockedSite } =
    data;

  const lines: string[] = [];

  // Header
  lines.push('📊 VisionFocus Report');
  lines.push('');

  // Stats
  if (totalBlockCount > 0) {
    lines.push(`🚫 Blocked: ${totalBlockCount} times`);
  }

  if (totalInvestTime > 0) {
    lines.push(`🎯 Invest Time: ${formatTime(totalInvestTime)}`);
  }

  if (totalWasteTime > 0) {
    lines.push(`⏰ Waste Time: ${formatTime(totalWasteTime)}`);
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
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );

    if (!blob) {
      return false;
    }

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

    return true;
  } catch {
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
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Capture DOM element as canvas using html2canvas-like approach
 * Note: This is a simplified version that creates a canvas from element data
 */
export async function captureElementAsCanvas(
  element: HTMLElement
): Promise<HTMLCanvasElement | null> {
  try {
    // Dynamically import html2canvas
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true
    });
    return canvas;
  } catch {
    return null;
  }
}
