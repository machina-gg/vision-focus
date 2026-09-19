/**
 * レポート下に出す支援誘導の表示状態を管理する
 *
 * 追跡は行わない。保存するのは「閉じた時刻」と「支援ページを開いたか」
 * だけで、外部への送信は一切しない。
 */

import { SUPPORT_PROMPT_SNOOZE_MS, BUY_ME_A_COFFEE_URL } from '~/constants';
import {
  DEFAULT_SUPPORT_PROMPT_STATE,
  type SupportPromptState
} from '~/types/storage';
import { supportPromptItem } from './storage';
import { objectOrFallback } from './storedValue';

export async function getSupportPromptState(): Promise<SupportPromptState> {
  // 旧形式で残った値は項目定義の fallback では弾けないためガードを通す
  return objectOrFallback(
    await supportPromptItem.getValue(),
    DEFAULT_SUPPORT_PROMPT_STATE
  );
}

async function setSupportPromptState(state: SupportPromptState): Promise<void> {
  await supportPromptItem.setValue(state);
}

/**
 * 支援誘導を表示すべきか判定する
 *
 * - 支援ページを開いたことがある → 表示しない（もう頼む必要がない）
 * - 閉じてから SUPPORT_PROMPT_SNOOZE_MS 未満 → 表示しない
 */
export function shouldShowSupportPrompt(
  state: SupportPromptState,
  now: number
): boolean {
  if (state.opened) return false;
  if (state.dismissedAt === null) return true;
  return now - state.dismissedAt >= SUPPORT_PROMPT_SNOOZE_MS;
}

/** 支援誘導を閉じた記録を残す */
export async function dismissSupportPrompt(now: number): Promise<void> {
  const state = await getSupportPromptState();
  await setSupportPromptState({ ...state, dismissedAt: now });
}

/** 支援ページを開いた記録を残す */
export async function markSupportPromptOpened(): Promise<void> {
  const state = await getSupportPromptState();
  await setSupportPromptState({ ...state, opened: true });
}

/**
 * Buy Me a Coffee の支援ページを新しいタブで開く
 *
 * Buy Me a Coffee のウィジェット JS は使わない。Manifest V3 は
 * リモートコードの実行を禁止しているため、素のリンクとして開く。
 */
export function openSupportPage(): void {
  chrome.tabs.create({ url: BUY_ME_A_COFFEE_URL });
}
