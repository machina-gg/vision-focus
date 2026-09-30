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
  /** 太い */
  bold: 700
};
