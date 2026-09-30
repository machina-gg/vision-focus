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
export const FONT_WEIGHTS = ['normal', 'bold'] as const;

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

/** フォント 1 つぶんの定義（表示名・CSS の値） */
export interface FontDefinition {
  /** このフォントの ID */
  family: FontFamily;
  /** 画面に出す表示名 */
  name: string;
  /** CSS の font-family に渡す値（先頭の名前は src/styles/globals.css で読む Fontsource の @font-face の font-family と一致させる） */
  css: string;
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
        css: "'Inter', sans-serif"
      },
      {
        family: 'roboto',
        name: 'Roboto',
        css: "'Roboto', sans-serif"
      },
      {
        family: 'poppins',
        name: 'Poppins',
        css: "'Poppins', sans-serif"
      },
      {
        family: 'lato',
        name: 'Lato',
        css: "'Lato', sans-serif"
      },
      {
        family: 'opensans',
        name: 'Open Sans',
        css: "'Open Sans', sans-serif"
      },
      {
        family: 'nunito',
        name: 'Nunito',
        css: "'Nunito', sans-serif"
      }
    ]
  },
  elegant: {
    name: 'Elegant',
    fonts: [
      {
        family: 'playfair',
        name: 'Playfair Display',
        css: "'Playfair Display', serif"
      },
      {
        family: 'merriweather',
        name: 'Merriweather',
        css: "'Merriweather', serif"
      },
      {
        family: 'lora',
        name: 'Lora',
        css: "'Lora', serif"
      },
      {
        family: 'crimsontext',
        name: 'Crimson Text',
        css: "'Crimson Text', serif"
      }
    ]
  },
  impact: {
    name: 'Impact',
    fonts: [
      {
        family: 'montserrat',
        name: 'Montserrat',
        css: "'Montserrat', sans-serif"
      },
      {
        family: 'oswald',
        name: 'Oswald',
        css: "'Oswald', sans-serif"
      },
      {
        family: 'bebasneue',
        name: 'Bebas Neue',
        css: "'Bebas Neue', sans-serif"
      },
      {
        family: 'raleway',
        name: 'Raleway',
        css: "'Raleway', sans-serif"
      }
    ]
  },
  handwriting: {
    name: 'Handwriting',
    fonts: [
      {
        family: 'dancingscript',
        name: 'Dancing Script',
        css: "'Dancing Script', cursive"
      },
      {
        family: 'caveat',
        name: 'Caveat',
        css: "'Caveat', cursive"
      }
    ]
  },
  japanese: {
    name: 'Japanese',
    fonts: [
      {
        family: 'notosansjp',
        name: 'Noto Sans JP',
        css: "'Noto Sans JP', sans-serif"
      },
      {
        family: 'mplusrounded',
        name: 'M PLUS Rounded 1c',
        css: "'M PLUS Rounded 1c', sans-serif"
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
