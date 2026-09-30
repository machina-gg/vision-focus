/** ダッシュボードの目標文に使えるフォントの ID の一覧（保存値・取り込みの検証に使う） */
export const FONT_FAMILIES = [
  'system',
  'inter',
  'roboto',
  'poppins',
  'lato',
  'opensans',
  'nunito',
  'playfair',
  'merriweather',
  'lora',
  'crimsontext',
  'montserrat',
  'oswald',
  'bebasneue',
  'raleway',
  'dancingscript',
  'caveat',
  'notosansjp',
  'notoserifjp',
  'mplusrounded'
] as const;

/** ダッシュボードの目標文に使えるフォントの ID */
export type FontFamily = (typeof FONT_FAMILIES)[number];

/** フォント選択画面の分類 */
export type FontCategory =
  'system' | 'modern' | 'elegant' | 'impact' | 'handwriting' | 'japanese';

/** 目標文の文字サイズの段階（選択肢に出す順。sm が最小、lg が最大） */
export const FONT_SIZES = ['sm', 'md', 'lg'] as const;

/** 目標文の文字サイズの段階 */
export type FontSize = (typeof FONT_SIZES)[number];

/** 目標文の文字の太さの段階（選択肢に出す順。normal が最も細く、bold が最も太い） */
export const FONT_WEIGHTS = ['normal', 'medium', 'bold'] as const;

/** 目標文の文字の太さの段階 */
export type FontWeight = (typeof FONT_WEIGHTS)[number];

/** ダッシュボードの目標文のフォント */
export interface FontSettings {
  /** 使うフォント */
  family: FontFamily;
  /** 文字サイズの段階 */
  size: FontSize;
  /** 文字の太さの段階 */
  weight: FontWeight;
}

/** フォント 1 つぶんの定義（表示名・CSS の値・読み込み先） */
export interface FontDefinition {
  /** このフォントの ID */
  family: FontFamily;
  /** 画面に出す表示名 */
  name: string;
  /** CSS の font-family に渡す値 */
  css: string;
  /** Google Fonts の family 指定（空白は +）。無ければ読み込み不要 */
  googleFont?: string;
}

const SYSTEM_FONT: FontDefinition = {
  family: 'system',
  name: 'System Default',
  css: 'ui-sans-serif, system-ui, sans-serif'
};

/** 分類ごとのフォント一覧（name は分類の表示名）。選択肢はこの分類順・分類内の順で並ぶ。フォントの定義の置き場はここだけ */
export const FONT_CATEGORIES: Record<
  FontCategory,
  { name: string; fonts: FontDefinition[] }
> = {
  system: {
    name: 'System',
    fonts: [SYSTEM_FONT]
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

/**
 * family の定義を返す。見つからなければシステムフォントの定義
 * @param family 探すフォントの ID
 * @returns family に一致するフォントの定義。無ければシステムフォントの定義
 */
export function getFontDefinition(family: FontFamily): FontDefinition {
  for (const category of Object.values(FONT_CATEGORIES)) {
    const font = category.fonts.find((f) => f.family === family);
    if (font) return font;
  }
  return SYSTEM_FONT;
}

/** 目標文のフォントの既定値（システムフォント・md・bold） */
export const DEFAULT_FONT_SETTINGS: FontSettings = {
  family: 'system',
  size: 'md',
  weight: 'bold'
};
