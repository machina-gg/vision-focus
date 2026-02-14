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
      // Blob生成に失敗
      return false;
    }

    // クリップボードAPIの利用可能性をチェック
    if (!navigator.clipboard || !navigator.clipboard.write) {
      // クリップボードAPIが利用できない場合は失敗として扱う
      return false;
    }

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

    return true;
  } catch {
    // クリップボードへの書き込みに失敗
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
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Capture DOM element as canvas using html2canvas
 * Note: Handles SVG elements from Recharts
 */
export async function captureElementAsCanvas(
  element: HTMLElement
): Promise<HTMLCanvasElement | null> {
  try {
    // html2canvasを動的にインポート
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;

    // 要素が完全にレンダリングされるまで少し待機
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // 高解像度
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true, // 複雑な要素のサポート向上
      onclone: (clonedDoc) => {
        // SVG要素のサイズをクローン内で適切に設定
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

    // キャンバスが有効なコンテンツで作成されたかを検証
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      // キャンバスの生成に失敗（無効なサイズ）
      return null;
    }

    return canvas;
  } catch {
    // 要素のキャンバス化に失敗
    return null;
  }
}
