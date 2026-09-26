import React from 'react';

import { Toggle } from '~/components/ui';

/** YouTubeFeatureToggle に渡す項目の表示内容と状態 */
interface YouTubeFeatureToggleProps {
  /** 項目の左に出すアイコン */
  icon: React.ReactNode;
  /** 項目の名前 */
  title: string;
  /** 名前の下に出す説明 */
  description: string;
  /** true ならオン（背景を赤系にする） */
  checked: boolean;
  /** スイッチが切り替わったときに切り替え後の状態を受け取る */
  onChange: (checked: boolean) => void;
  /** true なら薄く表示して切り替えられなくする */
  disabled?: boolean;
}

/**
 * YouTube の機能 1 つ分を、アイコン・名前・説明・スイッチを並べた行で表示する
 * @param props 項目の表示内容と状態（各フィールドは YouTubeFeatureToggleProps）
 * @returns 機能の行
 */
export function YouTubeFeatureToggle({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false
}: YouTubeFeatureToggleProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        disabled
          ? 'bg-gray-50 opacity-60'
          : checked
            ? 'bg-danger-50'
            : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div
        className={`p-1.5 rounded-lg ${checked && !disabled ? 'bg-danger-100 text-danger-600' : 'bg-gray-200 text-gray-500'}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4
            className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {title}
          </h4>
          <Toggle
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            size="sm"
          />
        </div>
        <p
          className={`text-xs mt-0.5 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
