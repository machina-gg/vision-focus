import { afterAll, beforeAll } from 'vitest';

import type { SupportedLanguage } from '~/types/storage';

import en from '../../public/_locales/en/messages.json';
import ja from '../../public/_locales/ja/messages.json';

export function stubI18nWithSubstitutions(): void {
  const target = globalThis as unknown as { chrome: { i18n?: unknown } };
  let original: unknown;

  beforeAll(() => {
    original = target.chrome.i18n;
    target.chrome.i18n = {
      getMessage: (name: string, substitutions?: string | string[]) =>
        substitutions === undefined
          ? name
          : `${name}(${[substitutions].flat().join(',')})`,
      getUILanguage: () => 'en'
    };
  });

  afterAll(() => {
    target.chrome.i18n = original;
  });
}

interface LocaleEntry {
  message: string;
  placeholders?: Record<string, { content: string }>;
}

const LOCALES: Record<SupportedLanguage, Record<string, LocaleEntry>> = {
  ja,
  en
};

function resolveLocaleMessage(
  entry: LocaleEntry,
  substitutions: string | string[] | undefined
): string {
  const values = substitutions === undefined ? [] : [substitutions].flat();
  const fill = (text: string) =>
    text.replace(/\$(\d)/g, (_, index: string) => values[Number(index) - 1]);
  return fill(
    entry.message.replace(/\$([A-Za-z0-9_]+)\$/g, (whole, name: string) => {
      const placeholder = entry.placeholders?.[name.toLowerCase()];
      return placeholder ? placeholder.content : whole;
    })
  );
}

/** chrome.i18n を実際の辞書（public/_locales）で引く形に差し替える。辞書に無いキーは空文字を返す（本物と同じ） */
export function stubI18nWithLocale(language: SupportedLanguage): void {
  const target = globalThis as unknown as { chrome: { i18n?: unknown } };
  let original: unknown;

  beforeAll(() => {
    original = target.chrome.i18n;
    const locale = LOCALES[language];
    target.chrome.i18n = {
      getMessage: (name: string, substitutions?: string | string[]) => {
        const entry = locale[name];
        return entry ? resolveLocaleMessage(entry, substitutions) : '';
      },
      getUILanguage: () => language
    };
  });

  afterAll(() => {
    target.chrome.i18n = original;
  });
}
