import { SUPPORT_PROMPT_SNOOZE_MS, BUY_ME_A_COFFEE_URL } from '~/constants';
import {
  DEFAULT_SUPPORT_PROMPT_STATE,
  type SupportPromptState
} from '~/types/storage';
import { supportPromptItem } from './storage';
import { objectOrFallback } from './storedValue';

export async function getSupportPromptState(): Promise<SupportPromptState> {
  return objectOrFallback(
    await supportPromptItem.getValue(),
    DEFAULT_SUPPORT_PROMPT_STATE
  );
}

async function setSupportPromptState(state: SupportPromptState): Promise<void> {
  await supportPromptItem.setValue(state);
}

/**
 * 支援誘導を出すか（支援ページを開いたことがあれば出さず、閉じてから一定時間は出さない）
 * @param now エポックからのミリ秒
 */
export function shouldShowSupportPrompt(
  state: SupportPromptState,
  now: number
): boolean {
  if (state.opened) return false;
  if (state.dismissedAt === null) return true;
  return now - state.dismissedAt >= SUPPORT_PROMPT_SNOOZE_MS;
}

/**
 * 支援誘導を閉じた時刻を残す
 * @param now エポックからのミリ秒
 */
export async function dismissSupportPrompt(now: number): Promise<void> {
  const state = await getSupportPromptState();
  await setSupportPromptState({ ...state, dismissedAt: now });
}

/** 支援ページを開いた記録を残す（以後は誘導を出さない） */
export async function markSupportPromptOpened(): Promise<void> {
  const state = await getSupportPromptState();
  await setSupportPromptState({ ...state, opened: true });
}

/** Buy Me a Coffee の支援ページを新しいタブで開く */
// Manifest V3 はリモートコードの実行を禁止しているため、Buy Me a Coffee のウィジェット JS は使わずリンクで開く
export function openSupportPage(): void {
  chrome.tabs.create({ url: BUY_ME_A_COFFEE_URL });
}
