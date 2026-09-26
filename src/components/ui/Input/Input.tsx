import type { InputHTMLAttributes } from 'react';
import React from 'react';

/** Input に渡すラベル・エラー文と、input 要素にそのまま渡す属性（onChange だけは文字列を受け取る形に置き換える） */
export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  /** 入力欄の上に出すラベル（省略時はラベルを出さない） */
  label?: string;
  /** 入力欄の下に赤字で出すエラー文（省略時は枠も通常色） */
  error?: string;
  /** 入力のたびに入力欄の文字列を受け取る */
  onChange?: (value: string) => void;
  /** ラベル・入力欄・エラー文を包む div に足すクラス */
  containerClassName?: string;
}

/**
 * ラベルとエラー文つきの 1 行入力欄を表示する
 * @param props ラベル・エラー文と input 要素の属性（各フィールドは InputProps。id を省略するとラベルとの対応用に自動で振る）
 * @returns ラベル・入力欄・エラー文をまとめた要素
 */
export function Input({
  label,
  error,
  onChange,
  className = '',
  containerClassName = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-3 py-2
          text-gray-900 placeholder-gray-400
          bg-white border rounded-lg
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-danger-500 focus:ring-danger-500' : 'border-gray-300'}
          ${className}
        `}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
      {error && <p className="text-sm text-danger-500">{error}</p>}
    </div>
  );
}
