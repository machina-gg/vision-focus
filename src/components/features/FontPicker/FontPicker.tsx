import React, { useId } from 'react';

import { ChevronDown, Type } from 'lucide-react';

import {
  type FontSettings,
  type FontSize,
  type FontWeight,
  FONT_CATEGORIES,
  FONT_FAMILIES,
  FONT_SIZES,
  FONT_WEIGHTS,
  getFontDefinition
} from '~/types/font';
import { FONT_SIZE_PX, FONT_WEIGHT_VALUE } from '~/constants/fonts';
import { getMessage } from '~/lib/i18n';

/** FontPicker に渡す現在のフォント設定と変更の受け取り先 */
export interface FontPickerProps {
  /** 選択中のフォントの種類・大きさ・太さ */
  value: FontSettings;
  /** どれかが変わったときに変更後の設定全体を受け取る */
  onChange: (settings: FontSettings) => void;
  /** true なら薄く表示して操作できなくする */
  disabled?: boolean;
  /** プレビュー欄に出す文言（省略時は 'Focus on your goals'） */
  previewText?: string;
}

const FONT_SIZE_LABELS: Record<FontSize, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large'
};

const FONT_WEIGHT_LABELS: Record<FontWeight, string> = {
  normal: 'Normal',
  bold: 'Bold'
};

/**
 * フォントの種類（分類の見出し付きのプルダウン）・大きさ・太さを選ぶ欄とプレビューを表示する
 * @param props 現在の設定と変更の受け取り先（各フィールドは FontPickerProps）
 * @returns プレビューと各選択欄をまとめた要素
 */
export function FontPicker({
  value,
  onChange,
  disabled = false,
  previewText = 'Focus on your goals'
}: FontPickerProps) {
  const familySelectId = useId();
  const currentFontDef = getFontDefinition(value.family);

  const handleChange = (updates: Partial<FontSettings>) => {
    onChange({ ...value, ...updates });
  };

  const handleFamilyChange = (selected: string) => {
    const family = FONT_FAMILIES.find((f) => f === selected);
    if (family) {
      handleChange({ family });
    }
  };

  const previewStyle: React.CSSProperties = {
    fontFamily: currentFontDef.css,
    fontSize: `${FONT_SIZE_PX[value.size]}px`,
    fontWeight: FONT_WEIGHT_VALUE[value.weight]
  };

  return (
    <div
      className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="p-4 bg-gray-900 rounded-lg">
        <p className="text-white text-center truncate" style={previewStyle}>
          {previewText}
        </p>
      </div>

      <div>
        <label
          htmlFor={familySelectId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          <Type className="w-4 h-4 inline-block mr-1" />
          {getMessage('fontFamily')}
        </label>
        <div className="relative">
          <select
            id={familySelectId}
            data-testid="font-family-select"
            value={value.family}
            disabled={disabled}
            onChange={(e) => handleFamilyChange(e.target.value)}
            className="w-full appearance-none px-3 py-2 pr-8 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {Object.entries(FONT_CATEGORIES).map(([categoryKey, category]) => (
              <optgroup key={categoryKey} label={category.name}>
                {category.fonts.map((font) => (
                  <option key={font.family} value={font.family}>
                    {font.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {getMessage('fontSize')}
        </label>
        <div className="flex gap-2">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              data-testid="font-size-button"
              aria-pressed={value.size === size}
              disabled={disabled}
              onClick={() => handleChange({ size })}
              className={`
                flex-1 px-3 py-2 text-sm rounded-lg border transition-colors
                ${
                  value.size === size
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }
              `}
            >
              {FONT_SIZE_LABELS[size]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {getMessage('fontWeight')}
        </label>
        <div className="flex gap-2">
          {FONT_WEIGHTS.map((weight) => (
            <button
              key={weight}
              data-testid="font-weight-button"
              aria-pressed={value.weight === weight}
              disabled={disabled}
              onClick={() => handleChange({ weight })}
              className={`
                flex-1 px-3 py-2 text-sm rounded-lg border transition-colors
                ${
                  value.weight === weight
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }
              `}
              style={{ fontWeight: FONT_WEIGHT_VALUE[weight] }}
            >
              {FONT_WEIGHT_LABELS[weight]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
