import { afterAll, beforeAll } from 'vitest';

/**
 * 置換値が見える chrome.i18n のスタブを、テストファイルの実行中だけ差し込む
 *
 * テスト環境には chrome.i18n が無く、`getMessage` はキー名をそのまま返す
 * （src/lib/i18n.ts のフォールバック）。それだと `$1` に入る置換値
 * （件数・分数・ドメイン等）が描画結果に現れず、「渡した値が表示に出ているか」を
 * 検査できない。置換値をキー名の後ろに括弧書きで出すことで検査できるようにする。
 *
 * 例: `getMessage('blockedTimesShort', '3')` → `blockedTimesShort(3)`
 */
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
