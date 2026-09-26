// 辞書 JSON をここから import しない（同じ辞書が JavaScript バンドルにも入り、出力に二重で載る）

import type { SupportedLanguage } from '~/types/storage';

/**
 * ブラウザの UI 言語を対応言語（ja / en）に絞って返す。日付・数値の整形用で、文言の解決は getMessage で行う
 * @returns UI 言語が ja で始まれば 'ja'、それ以外と取得できないときは 'en'
 */
export function getUILanguage(): SupportedLanguage {
  try {
    return chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * messages.json の翻訳文を返す（辞書に無ければキーをそのまま返す）
 * @param messageName messages.json のキー
 * @param substitutions プレースホルダ（$1〜$9）に入れる値
 * @returns 翻訳文（辞書に無いか取得できなければ messageName）
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
