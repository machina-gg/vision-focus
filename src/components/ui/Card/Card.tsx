import type { HTMLAttributes, ReactNode } from 'react';
import React from 'react';

type CardVariant = 'default' | 'outlined' | 'elevated';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
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
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
