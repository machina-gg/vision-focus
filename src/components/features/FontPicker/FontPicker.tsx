import React, { useState, useEffect } from 'react';

import { Type } from 'lucide-react';

import {
  type FontSettings,
  type FontSize,
  type FontWeight,
  type FontCategory,
  FONT_CATEGORIES,
  getFontDefinition,
  getFontCategory
} from '~/types/storage';
import { getMessage } from '~/lib/i18n';

export interface FontPickerProps {
  value: FontSettings;
  onChange: (settings: FontSettings) => void;
  disabled?: boolean;
  previewText?: string;
}

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' }
];

const FONT_WEIGHTS: { value: FontWeight; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semibold' },
  { value: 'bold', label: 'Bold' }
];

const FONT_SIZE_PX: Record<FontSize, number> = {
  sm: 24,
  md: 30,
  lg: 36,
  xl: 48
};

const FONT_WEIGHT_VALUE: Record<FontWeight, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700
};

const CATEGORY_ORDER: FontCategory[] = [
  'system',
  'modern',
  'elegant',
  'impact',
  'handwriting',
  'japanese'
];

// Load Google Font dynamically
function loadGoogleFont(fontName: string) {
  const linkId = `google-font-${fontName.replace(/\+/g, '-')}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function FontPicker({
  value,
  onChange,
  disabled = false,
  previewText = 'Focus on your goals'
}: FontPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<FontCategory>(() =>
    getFontCategory(value.family)
  );

  // Load font when family changes
  useEffect(() => {
    const fontDef = getFontDefinition(value.family);
    if (fontDef.googleFont) {
      loadGoogleFont(fontDef.googleFont);
    }
  }, [value.family]);

  // Load fonts for selected category
  useEffect(() => {
    const category = FONT_CATEGORIES[selectedCategory];
    category.fonts.forEach((font) => {
      if (font.googleFont) {
        loadGoogleFont(font.googleFont);
      }
    });
  }, [selectedCategory]);

  const handleChange = (updates: Partial<FontSettings>) => {
    onChange({ ...value, ...updates });
  };

  const handleCategoryChange = (category: FontCategory) => {
    setSelectedCategory(category);
    // Auto-select first font in category
    const firstFont = FONT_CATEGORIES[category].fonts[0];
    if (firstFont) {
      handleChange({ family: firstFont.family });
    }
  };

  const currentFontDef = getFontDefinition(value.family);

  const previewStyle: React.CSSProperties = {
    fontFamily: currentFontDef.css,
    fontSize: `${FONT_SIZE_PX[value.size]}px`,
    fontWeight: FONT_WEIGHT_VALUE[value.weight]
  };

  return (
    <div
      className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Preview */}
      <div className="p-4 bg-gray-900 rounded-lg">
        <p className="text-white text-center truncate" style={previewStyle}>
          {previewText}
        </p>
      </div>

      {/* Font Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Type className="w-4 h-4 inline-block mr-1" />
          {getMessage('fontCategory')}
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((categoryKey) => {
            const category = FONT_CATEGORIES[categoryKey];
            return (
              <button
                key={categoryKey}
                onClick={() => handleCategoryChange(categoryKey)}
                className={`
                  px-3 py-1.5 text-sm rounded-lg border transition-colors
                  ${
                    selectedCategory === categoryKey
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }
                `}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Family (within selected category) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {getMessage('fontFamily')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FONT_CATEGORIES[selectedCategory].fonts.map((font) => (
            <button
              key={font.family}
              onClick={() => handleChange({ family: font.family })}
              className={`
                px-3 py-2 text-sm rounded-lg border transition-colors text-left
                ${
                  value.family === font.family
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }
              `}
              style={{ fontFamily: font.css }}
            >
              {font.name}
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
                ${
                  value.size === size.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }
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
                ${
                  value.weight === weight.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }
              `}
              style={{ fontWeight: FONT_WEIGHT_VALUE[weight.value] }}
            >
              {weight.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
