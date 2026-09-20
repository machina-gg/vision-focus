/**
 * chrome.i18n の薄い包み。
 *
 * 辞書は `public/_locales/{en,ja}/messages.json` に置き、Chrome が
 * manifest の `default_locale` とブラウザの言語設定から自動で選ぶ。
 * 拡張機能側に言語切替は持たない（machina-gg/vision-focus#401）。
 *
 * ⚠ 辞書 JSON をここから import しないこと。import すると同じ辞書が
 * JavaScript バンドルにも入り、出力に二重で載る。
 */

import type { SupportedLanguage } from '~/types/storage';

/**
 * ブラウザの UI 言語を、対応言語に絞り込んで返す
 *
 * 日付・数値の整形（`toLocaleString` 等）に渡すための値で、
 * 文言そのものの解決には使わない（それは `getMessage` の役目）。
 */
export function getUILanguage(): SupportedLanguage {
  try {
    // 拡張機能以外の実行環境（Storybook 等）では chrome が無い
    return chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * 翻訳済みの文言を返す
 *
 * @param messageName - messages.json のキー
 * @param substitutions - プレースホルダ（`$1`〜`$9`）に入れる値
 * @returns 翻訳文。辞書に無い場合はキーをそのまま返す（欠落に気づけるようにするため）
 */
export function getMessage(
  messageName: string,
  substitutions?: string | string[]
): string {
  try {
    // 辞書に無いキーでは chrome.i18n が空文字を返す
    return chrome.i18n.getMessage(messageName, substitutions) || messageName;
  } catch {
    return messageName;
  }
}
