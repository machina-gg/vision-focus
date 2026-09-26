import { formatTime } from './time';

/** SNS に共有するレポート文を作る（totalWasteTime は秒。0 や未指定の項目は省く） */
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

  lines.push('📊 VisionFocus Report');
  lines.push('');

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

/** X の投稿画面を、文を入れた状態で新しいタブに開く */
export function shareToX(text: string): void {
  const encodedText = encodeURIComponent(text);
  const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** canvas を PNG でクリップボードに写す（できなければ false） */
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
      return false;
    }

    if (!navigator.clipboard || !navigator.clipboard.write) {
      return false;
    }

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

    return true;
  } catch {
    return false;
  }
}

/** canvas を PNG でダウンロードする */
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

/** 要素を画像化した canvas を返す（失敗したか大きさが 0 なら null） */
export async function captureElementAsCanvas(
  element: HTMLElement
): Promise<HTMLCanvasElement | null> {
  try {
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;

    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
      onclone: (clonedDoc) => {
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

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return null;
    }

    return canvas;
  } catch {
    return null;
  }
}
