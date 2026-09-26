// 辞書 JSON をここから import しない（同じ辞書が JavaScript バンドルにも入り、出力に二重で載る）

import type { SupportedLanguage } from '~/types/storage';

export function getUILanguage(): SupportedLanguage {
  try {
    return chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';
  } catch {
    return 'en';
  }
}

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
