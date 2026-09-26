import type { ReactNode } from 'react';
import React from 'react';

type BadgeVariant =
  'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium';

/** Badge に渡す表示内容と色の種類 */
export interface BadgeProps {
  /** 色の種類（省略時は 'default' の灰色） */
  variant?: BadgeVariant;
  /** バッジの中に表示する内容 */
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-info-100 text-info-700',
  premium: 'bg-premium-100 text-premium-700'
};

/**
 * 短いラベルを角丸の色付き枠で表示する
 * @param props 表示内容と色の種類（各フィールドは BadgeProps）
 * @returns 色付きのラベル要素
 */
export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5
        text-xs font-medium rounded-full
        ${variantStyles[variant]}
      `}
      data-variant={variant}
    >
      {children}
    </span>
  );
}
