// Font type definitions and utilities

// Font family options
export type FontFamily =
  | 'system'
  // Modern
  | 'inter'
  | 'roboto'
  | 'poppins'
  | 'lato'
  | 'opensans'
  | 'nunito'
  // Elegant
  | 'playfair'
  | 'merriweather'
  | 'lora'
  | 'crimsontext'
  // Impact
  | 'montserrat'
  | 'oswald'
  | 'bebasneue'
  | 'raleway'
  // Handwriting
  | 'dancingscript'
  | 'caveat'
  // Japanese
  | 'notosansjp'
  | 'notoserifjp'
  | 'mplusrounded';

export type FontCategory =
  | 'system'
  | 'modern'
  | 'elegant'
  | 'impact'
  | 'handwriting'
  | 'japanese';

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export interface FontSettings {
  family: FontFamily;
  size: FontSize;
  weight: FontWeight;
}

// Font category definitions
export interface FontDefinition {
  family: FontFamily;
  name: string;
  css: string;
  googleFont?: string; // Google Fonts name for loading
}

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

// Helper to get font definition by family
export function getFontDefinition(family: FontFamily): FontDefinition {
  for (const category of Object.values(FONT_CATEGORIES)) {
    const font = category.fonts.find((f) => f.family === family);
    if (font) return font;
  }
  return FONT_CATEGORIES.system.fonts[0];
}

// Helper to get category for a font family
export function getFontCategory(family: FontFamily): FontCategory {
  for (const [categoryKey, category] of Object.entries(FONT_CATEGORIES)) {
    if (category.fonts.some((f) => f.family === family)) {
      return categoryKey as FontCategory;
    }
  }
  return 'system';
}

// Font family CSS mappings (uses FONT_CATEGORIES)
export const getFontFamilyCSS = (family: FontFamily): string => {
  return getFontDefinition(family).css;
};

// Legacy compatibility - dynamically generated
export const FONT_FAMILY_MAP: Record<string, string> = Object.values(
  FONT_CATEGORIES
)
  .flatMap((cat) => cat.fonts)
  .reduce((acc, font) => ({ ...acc, [font.family]: font.css }), {});

// Font size Tailwind class mappings
export const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
  xl: 'text-5xl'
};

// Font weight Tailwind class mappings
export const FONT_WEIGHT_MAP: Record<FontWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
};

// Font family display names (uses FONT_CATEGORIES)
export const FONT_FAMILY_NAMES: Record<string, string> = Object.values(
  FONT_CATEGORIES
)
  .flatMap((cat) => cat.fonts)
  .reduce((acc, font) => ({ ...acc, [font.family]: font.name }), {});

// Default font settings
export const DEFAULT_FONT_SETTINGS: FontSettings = {
  family: 'system',
  size: 'md',
  weight: 'bold'
};
