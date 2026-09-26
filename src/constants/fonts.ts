/** 文字サイズの選択肢（sm / md / lg / xl）ごとの大きさ（px） */
export const FONT_SIZE_PX: Record<string, number> = {
  sm: 24,
  md: 30,
  lg: 36,
  xl: 48
};

/** 文字の太さの選択肢（normal / medium / semibold / bold）ごとの font-weight の値 */
export const FONT_WEIGHT_VALUE: Record<string, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700
};

/**
 * Google Fonts のスタイルシートを head に読み込む（同じフォントは 2 回読まない）
 * @param fontName Google Fonts の family 名（空白は + で表す）
 */
export function loadGoogleFont(fontName: string): void {
  const linkId = `google-font-${fontName.replace(/\+/g, '-')}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
