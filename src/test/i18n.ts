import { afterAll, beforeAll } from 'vitest';

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
