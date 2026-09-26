import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

/** PasswordField に渡す欄の識別子・入力値と表示の切り替え */
interface PasswordFieldProps {
  /** ラベルの指し先（htmlFor）とテスト用の目印を兼ねるため、同じ画面の欄ごとに別の値を渡す */
  fieldId: string;
  /** 入力欄の上に出すラベル */
  label: string;
  /** 入力中のパスワード */
  value: string;
  /** 入力が変わったときに入力欄の文字列を受け取る */
  onChange: (value: string) => void;
  /** true なら伏せ字にせずそのまま見せる */
  show: boolean;
  /** 目のアイコンが押されたときに呼ぶ */
  onToggleShow: () => void;
  /** 未入力のときに出す案内文 */
  placeholder: string;
  /** 入力欄でキーが押されたときに受け取る */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** true なら表示したときに入力欄へフォーカスを当てる */
  autoFocus?: boolean;
}

/**
 * ラベルつきのパスワード入力欄と、伏せ字を切り替える目のアイコンを表示する
 * @param props 欄の識別子・入力値と表示の切り替え（各フィールドは PasswordFieldProps）
 * @returns ラベルと入力欄の要素
 */
export function PasswordField({
  fieldId,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  onKeyDown,
  autoFocus
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <div className="relative">
        <Input
          id={fieldId}
          data-testid={fieldId}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="pr-10"
          autoFocus={autoFocus}
        />
        <button
          type="button"
          aria-label={
            show ? getMessage('hidePassword') : getMessage('showPassword')
          }
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
