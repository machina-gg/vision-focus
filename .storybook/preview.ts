import type { Preview } from '@storybook/react-vite';

import '../src/styles/globals.css';
import enMessages from '../public/_locales/en/messages.json';

/**
 * chrome.i18n の最小スタブ
 *
 * 文言は `src/lib/i18n.ts` が chrome.i18n から引く（machina-gg/vision-focus#401）。
 * Storybook は拡張機能の外で動くため chrome が無く、スタブが無いとすべての
 * 文言がキー名のまま表示される。既定ロケール（en）の辞書だけを読む。
 *
 * ⚠ このスタブは Storybook のバンドルにだけ入る。拡張機能の出力に辞書が
 * 二重に入らないよう、`src/` 配下から messages.json を import しないこと。
 */
interface MessageEntry {
  message: string;
  placeholders?: Record<string, { content: string }>;
}

const dictionary = enMessages as Record<string, MessageEntry>;

function getMessage(
  messageName: string,
  substitutions?: string | string[]
): string {
  const entry = dictionary[messageName];
  if (!entry) return '';

  const values =
    substitutions === undefined
      ? []
      : Array.isArray(substitutions)
        ? substitutions
        : [substitutions];

  // 名前付きプレースホルダ（$DOMAIN$）を定義された content（$1 形式）へ置き換えてから、
  // 番号で実際の値に差し替える（chrome.i18n と同じ解決順）
  const placeholders = entry.placeholders ?? {};
  return entry.message
    .replace(
      /\$([A-Za-z0-9_@]+)\$/g,
      (whole, name: string) =>
        placeholders[name.toLowerCase()]?.content ?? whole
    )
    .replace(
      /\$([1-9])/g,
      (whole, index: string) => values[+index - 1] ?? whole
    );
}

(globalThis as unknown as { chrome: unknown }).chrome = {
  i18n: { getMessage, getUILanguage: () => 'en' }
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    // 背景の選択肢はここだけに置く。story は globals.backgrounds.value にキーを書いて既定を選ぶ
    // （キーが options に無いと、ビルドは通ったまま背景色だけが効かなくなる）
    backgrounds: {
      options: {
        light: { name: 'light', value: '#ffffff' },
        dark: { name: 'dark', value: '#1f2937' },
        gray: { name: 'gray', value: '#f3f4f6' }
      }
    },
    layout: 'centered'
  },

  initialGlobals: {
    backgrounds: {
      value: 'light'
    }
  }
};

export default preview;
