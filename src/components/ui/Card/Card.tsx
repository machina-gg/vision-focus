import type { HTMLAttributes, ReactNode } from 'react';
import React from 'react';

type CardVariant = 'default' | 'outlined' | 'elevated';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/** Card に渡す見た目の指定と、div 要素にそのまま渡す属性 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 枠線と影の付け方（省略時は 'default'） */
  variant?: CardVariant;
  /** 内側の余白（省略時は 'md'） */
  padding?: CardPadding;
  /** カードの中に表示する内容 */
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-gray-200 shadow-sm',
  outlined: 'bg-white border border-gray-200',
  elevated: 'bg-white shadow-md border border-gray-100'
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

/**
 * 内容を角丸の白い枠で囲んで表示する（onClick を渡すとボタンとして振る舞う）
 * @param props 見た目の指定と div 要素の属性（各フィールドは CardProps）
 * @returns カードの div 要素
 */
export function Card({
  variant = 'default',
  padding = 'md',
  onClick,
  children,
  className = '',
  ...props
}: CardProps) {
  const isClickable = !!onClick;

  return (
    <div
      className={`
        rounded-xl
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${isClickable ? 'cursor-pointer hover:border-primary-300 transition-colors' : ''}
        ${className}
      `}
      data-variant={variant}
      data-padding={padding}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
