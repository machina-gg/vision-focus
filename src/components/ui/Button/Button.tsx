import type { ButtonHTMLAttributes, ReactNode } from 'react';
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

/** Button に渡す見た目の指定と、button 要素にそのまま渡す属性 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 色の種類（省略時は 'primary'） */
  variant?: ButtonVariant;
  /** 余白と文字の大きさ（省略時は 'md'） */
  size?: ButtonSize;
  /** true の間は回転アイコンを出し、押せなくする */
  loading?: boolean;
  /** true なら親の幅いっぱいに広げる */
  fullWidth?: boolean;
  /** ボタンのラベルとして表示する内容 */
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

/**
 * 色・大きさ・読み込み中表示を切り替えられるボタンを表示する
 * @param props 見た目の指定と button 要素の属性（各フィールドは ButtonProps。disabled か loading のどちらかが true なら押せない）
 * @returns button 要素
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-lg
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      data-variant={variant}
      data-size={size}
      data-full-width={String(fullWidth)}
      data-loading={String(loading)}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
