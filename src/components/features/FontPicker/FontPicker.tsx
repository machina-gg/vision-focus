import React from 'react'

import { Type } from 'lucide-react'

import {
  type FontSettings,
  type FontFamily,
  type FontSize,
  type FontWeight,
  FONT_FAMILY_MAP,
  FONT_FAMILY_NAMES,
} from '~/types/storage'
import { getMessage } from '~/lib/i18n'

export interface FontPickerProps {
  value: FontSettings
  onChange: (settings: FontSettings) => void
  disabled?: boolean
  previewText?: string
}

const FONT_FAMILIES: FontFamily[] = [
  'system',
  'inter',
  'roboto',
  'playfair',
  'montserrat',
]

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
]

const FONT_WEIGHTS: { value: FontWeight; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semibold' },
  { value: 'bold', label: 'Bold' },
]

const FONT_SIZE_PX: Record<FontSize, number> = {
  sm: 24,
  md: 30,
  lg: 36,
  xl: 48,
}

const FONT_WEIGHT_VALUE: Record<FontWeight, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

export function FontPicker({
  value,
  onChange,
  disabled = false,
  previewText = 'Focus on your goals',
}: FontPickerProps) {
  const handleChange = (updates: Partial<FontSettings>) => {
    onChange({ ...value, ...updates })
  }

  const previewStyle: React.CSSProperties = {
    fontFamily: FONT_FAMILY_MAP[value.family],
    fontSize: `${FONT_SIZE_PX[value.size]}px`,
    fontWeight: FONT_WEIGHT_VALUE[value.weight],
  }

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Preview */}
      <div className="p-4 bg-gray-900 rounded-lg">
        <p className="text-white text-center truncate" style={previewStyle}>
          {previewText}
        </p>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Type className="w-4 h-4 inline-block mr-1" />
          {getMessage('fontFamily')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FONT_FAMILIES.map((family) => (
            <button
              key={family}
              onClick={() => handleChange({ family })}
              className={`
                px-3 py-2 text-sm rounded-lg border transition-colors
                ${value.family === family
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'}
              `}
              style={{ fontFamily: FONT_FAMILY_MAP[family] }}
            >
              {FONT_FAMILY_NAMES[family]}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {getMessage('fontSize')}
        </label>
        <div className="flex gap-2">
          {FONT_SIZES.map((size) => (
            <button
              key={size.value}
              onClick={() => handleChange({ size: size.value })}
              className={`
                flex-1 px-3 py-2 text-sm rounded-lg border transition-colors
                ${value.size === size.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'}
              `}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Weight */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {getMessage('fontWeight')}
        </label>
        <div className="flex gap-2">
          {FONT_WEIGHTS.map((weight) => (
            <button
              key={weight.value}
              onClick={() => handleChange({ weight: weight.value })}
              className={`
                flex-1 px-3 py-2 text-sm rounded-lg border transition-colors
                ${value.weight === weight.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'}
              `}
              style={{ fontWeight: FONT_WEIGHT_VALUE[weight.value] }}
            >
              {weight.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
