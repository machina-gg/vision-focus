import type { ReactNode } from 'react';
import React from 'react';

type BadgeVariant =
  'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium';

export interface BadgeProps {
  variant?: BadgeVariant;
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

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5
        text-xs font-medium rounded-full
        ${variantStyles[variant]}
      `}
      // 見た目の種類を属性としても持たせる。装飾のクラス名にしか出ていないと、
      // 支援技術にもテストにも種類が伝わらない（machina-gg/vision-focus#455）
      data-variant={variant}
    >
      {children}
    </span>
  );
}
