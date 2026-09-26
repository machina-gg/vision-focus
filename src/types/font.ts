/** ダッシュボードの目標文に使えるフォントの ID */
export type FontFamily =
  | 'system'
  | 'inter'
  | 'roboto'
  | 'poppins'
  | 'lato'
  | 'opensans'
  | 'nunito'
  | 'playfair'
  | 'merriweather'
  | 'lora'
  | 'crimsontext'
  | 'montserrat'
  | 'oswald'
  | 'bebasneue'
  | 'raleway'
  | 'dancingscript'
  | 'caveat'
  | 'notosansjp'
  | 'notoserifjp'
  | 'mplusrounded';

/** フォント選択画面の分類 */
export type FontCategory =
  'system' | 'modern' | 'elegant' | 'impact' | 'handwriting' | 'japanese';

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';

/** ダッシュボードの目標文のフォント */
export interface FontSettings {
  family: FontFamily;
  size: FontSize;
  weight: FontWeight;
}

export interface FontDefinition {
  family: FontFamily;
  /** 画面に出す表示名 */
  name: string;
  /** CSS の font-family に渡す値 */
  css: string;
  /** Google Fonts の family 指定（空白は +）。無ければ読み込み不要 */
  googleFont?: string;
}

/** フォント選択画面に並べる分類ごとのフォント一覧。フォントの定義の置き場はここだけ */
export const FONT_CATEGORIES: Record<
  FontCategory,
  { name: string; fonts: FontDefinition[] }
> = {
  system: {
    name: 'System',
    fonts: [
      {
        family: 'system',
        name: 'System Default',
        css: 'ui-sans-serif, system-ui, sans-serif'
      }
    ]
  },
  modern: {
    name: 'Modern',
    fonts: [
      {
        family: 'inter',
        name: 'Inter',
        css: "'Inter', sans-serif",
        googleFont: 'Inter'
      },
      {
        family: 'roboto',
        name: 'Roboto',
        css: "'Roboto', sans-serif",
        googleFont: 'Roboto'
      },
      {
        family: 'poppins',
        name: 'Poppins',
        css: "'Poppins', sans-serif",
        googleFont: 'Poppins'
      },
      {
        family: 'lato',
        name: 'Lato',
        css: "'Lato', sans-serif",
        googleFont: 'Lato'
      },
      {
        family: 'opensans',
        name: 'Open Sans',
        css: "'Open Sans', sans-serif",
        googleFont: 'Open+Sans'
      },
      {
        family: 'nunito',
        name: 'Nunito',
        css: "'Nunito', sans-serif",
        googleFont: 'Nunito'
      }
    ]
  },
  elegant: {
    name: 'Elegant',
    fonts: [
      {
        family: 'playfair',
        name: 'Playfair Display',
        css: "'Playfair Display', serif",
        googleFont: 'Playfair+Display'
      },
      {
        family: 'merriweather',
        name: 'Merriweather',
        css: "'Merriweather', serif",
        googleFont: 'Merriweather'
      },
      {
        family: 'lora',
        name: 'Lora',
        css: "'Lora', serif",
        googleFont: 'Lora'
      },
      {
        family: 'crimsontext',
        name: 'Crimson Text',
        css: "'Crimson Text', serif",
        googleFont: 'Crimson+Text'
      }
    ]
  },
  impact: {
    name: 'Impact',
    fonts: [
      {
        family: 'montserrat',
        name: 'Montserrat',
        css: "'Montserrat', sans-serif",
        googleFont: 'Montserrat'
      },
      {
        family: 'oswald',
        name: 'Oswald',
        css: "'Oswald', sans-serif",
        googleFont: 'Oswald'
      },
      {
        family: 'bebasneue',
        name: 'Bebas Neue',
        css: "'Bebas Neue', sans-serif",
        googleFont: 'Bebas+Neue'
      },
      {
        family: 'raleway',
        name: 'Raleway',
        css: "'Raleway', sans-serif",
        googleFont: 'Raleway'
      }
    ]
  },
  handwriting: {
    name: 'Handwriting',
    fonts: [
      {
        family: 'dancingscript',
        name: 'Dancing Script',
        css: "'Dancing Script', cursive",
        googleFont: 'Dancing+Script'
      },
      {
        family: 'caveat',
        name: 'Caveat',
        css: "'Caveat', cursive",
        googleFont: 'Caveat'
      }
    ]
  },
  japanese: {
    name: 'Japanese',
    fonts: [
      {
        family: 'notosansjp',
        name: 'Noto Sans JP',
        css: "'Noto Sans JP', sans-serif",
        googleFont: 'Noto+Sans+JP'
      },
      {
        family: 'notoserifjp',
        name: 'Noto Serif JP',
        css: "'Noto Serif JP', serif",
        googleFont: 'Noto+Serif+JP'
      },
      {
        family: 'mplusrounded',
        name: 'M PLUS Rounded 1c',
        css: "'M PLUS Rounded 1c', sans-serif",
        googleFont: 'M+PLUS+Rounded+1c'
      }
    ]
  }
};

/** family の定義を返す。見つからなければシステムフォントの定義 */
export function getFontDefinition(family: FontFamily): FontDefinition {
  for (const category of Object.values(FONT_CATEGORIES)) {
    const font = category.fonts.find((f) => f.family === family);
    if (font) return font;
  }
  return FONT_CATEGORIES.system.fonts[0];
}

/** family が属する分類を返す。見つからなければ 'system' */
export function getFontCategory(family: FontFamily): FontCategory {
  for (const [categoryKey, category] of Object.entries(FONT_CATEGORIES)) {
    if (category.fonts.some((f) => f.family === family)) {
      return categoryKey as FontCategory;
    }
  }
  return 'system';
}

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  family: 'system',
  size: 'md',
  weight: 'bold'
};
