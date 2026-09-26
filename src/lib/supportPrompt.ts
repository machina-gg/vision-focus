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

export function shouldShowSupportPrompt(
  state: SupportPromptState,
  now: number
): boolean {
  if (state.opened) return false;
  if (state.dismissedAt === null) return true;
  return now - state.dismissedAt >= SUPPORT_PROMPT_SNOOZE_MS;
}

export async function dismissSupportPrompt(now: number): Promise<void> {
  const state = await getSupportPromptState();
  await setSupportPromptState({ ...state, dismissedAt: now });
}

export async function markSupportPromptOpened(): Promise<void> {
  const state = await getSupportPromptState();
  await setSupportPromptState({ ...state, opened: true });
}

// Manifest V3 はリモートコードの実行を禁止しているため、Buy Me a Coffee のウィジェット JS は使わずリンクで開く
export function openSupportPage(): void {
  chrome.tabs.create({ url: BUY_ME_A_COFFEE_URL });
}
