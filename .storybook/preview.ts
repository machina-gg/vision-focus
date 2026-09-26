import type { Preview } from '@storybook/react-vite';

import '../src/styles/globals.css';
import enMessages from '../public/_locales/en/messages.json';

// chrome.i18n のスタブ。`src/` 配下から messages.json を import しない（拡張機能の出力に辞書が二重に入る）
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

  // chrome.i18n と同じく、名前付きプレースホルダを $1 形式へ置き換えてから番号で差し替える
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
    // story の globals.backgrounds.value のキーが options に無いと、背景色だけが黙って効かなくなる
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
