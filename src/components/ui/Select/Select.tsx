import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

/** Select に渡す選択中の値と選択肢 */
interface SelectProps {
  /** 選択中の選択肢の value */
  value: string;
  /** 選択が変わったときに新しい value を受け取る */
  onChange: (value: string) => void;
  /** 表示する選択肢（並び順のまま出す） */
  options: SelectOption[];
  /** 先頭に出す選べない案内文（省略時は出さない） */
  placeholder?: string;
  /** 外側の div に足すクラス */
  className?: string;
  /** true なら選択できなくする */
  disabled?: boolean;
}

/**
 * 右端に下向き矢印を付けたプルダウンを表示する
 * @param props 選択中の値・選択肢・変更の受け取り先（各フィールドは SelectProps）
 * @returns プルダウンの要素
 */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  disabled = false
}: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full appearance-none px-3 py-2 pr-8
          bg-white border border-gray-300 rounded-lg
          text-sm text-gray-900
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}
