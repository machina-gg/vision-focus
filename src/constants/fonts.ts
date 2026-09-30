import type { FontSize, FontWeight } from '~/types/font';

/** 文字サイズの段階ごとの大きさ（px）。ダッシュボードとプレビューのどちらもこの値で描く */
export const FONT_SIZE_PX: Record<FontSize, number> = {
  /** 小（px） */
  sm: 30,
  /** 中（px） */
  md: 36,
  /** 大（px） */
  lg: 48
};

/** 文字の太さの段階ごとの font-weight の値 */
export const FONT_WEIGHT_VALUE: Record<FontWeight, number> = {
  /** 標準 */
  normal: 400,
  /** やや太い */
  medium: 500,
  /** 太い */
  bold: 700
};

/**
 * Google Fonts のスタイルシートを head に読み込む（同じフォントは 2 回読まない）
 * @param fontName Google Fonts の family 名（空白は + で表す）
 */
export function loadGoogleFont(fontName: string): void {
  const linkId = `google-font-${fontName.replace(/\+/g, '-')}`;
  if (document.getElementById(linkId)) return;

  // Google Fonts の css2 API は wght の値が数値順に並んでいないと受け付けない
  const weights = Object.values(FONT_WEIGHT_VALUE)
    .sort((a, b) => a - b)
    .join(';');
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@${weights}&display=swap`;
  document.head.appendChild(link);
}
