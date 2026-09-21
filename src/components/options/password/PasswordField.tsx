import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

interface PasswordFieldProps {
  /**
   * 入力欄の識別子。ラベルの指し先（htmlFor）とテスト用の目印を兼ねるため、
   * 同じ画面に複数の欄を出す呼び出し側は欄ごとに別の値を渡す
   * （machina-gg/vision-focus#468）
   */
  fieldId: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
}

/** Reusable password input field with visibility toggle */
export function PasswordField({
  fieldId,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder
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
          // 識別子をテスト用の目印にも使う。ラベルの指し先と目印が同じ値なので、
          // 片方だけ書き換えて食い違うことがない（machina-gg/vision-focus#468）
          id={fieldId}
          data-testid={fieldId}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          // アイコンだけのボタンなので名前を属性で持たせる。表示中かどうかも
          // 目のアイコンの差でしか出ておらず、読み上げでは区別が付かない
          // （machina-gg/vision-focus#455）
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
