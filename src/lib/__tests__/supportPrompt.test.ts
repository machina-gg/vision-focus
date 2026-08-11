import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { storage } from '~/lib/storage';
import { SUPPORT_PROMPT_SNOOZE_MS, BUY_ME_A_COFFEE_URL } from '~/constants';
import {
  DEFAULT_SUPPORT_PROMPT_STATE,
  dismissSupportPrompt,
  getSupportPromptState,
  markSupportPromptOpened,
  openSupportPage,
  shouldShowSupportPrompt
} from '~/lib/supportPrompt';

const mockGet = vi.mocked(storage.get);
const mockSet = vi.mocked(storage.set);
const mockTabsCreate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).chrome = {
    tabs: { create: mockTabsCreate }
  };
});

describe('getSupportPromptState', () => {
  it('保存されていない場合は初期状態を返す', async () => {
    mockGet.mockResolvedValue(undefined);

    await expect(getSupportPromptState()).resolves.toEqual(
      DEFAULT_SUPPORT_PROMPT_STATE
    );
  });

  it('保存済みの状態をそのまま返す', async () => {
    mockGet.mockResolvedValue({ dismissedAt: 1000, opened: false });

    await expect(getSupportPromptState()).resolves.toEqual({
      dismissedAt: 1000,
      opened: false
    });
  });
});

describe('shouldShowSupportPrompt', () => {
  it('一度も操作していなければ表示する', () => {
    expect(
      shouldShowSupportPrompt({ dismissedAt: null, opened: false }, 0)
    ).toBe(true);
  });

  it('支援ページを開いたことがあれば表示しない', () => {
    expect(
      shouldShowSupportPrompt({ dismissedAt: null, opened: true }, 0)
    ).toBe(false);
  });

  it('閉じてから猶予期間が経過していなければ表示しない', () => {
    const dismissedAt = 1_000_000;

    expect(
      shouldShowSupportPrompt(
        { dismissedAt, opened: false },
        dismissedAt + SUPPORT_PROMPT_SNOOZE_MS - 1
      )
    ).toBe(false);
  });

  it('閉じてから猶予期間が経過していれば再表示する', () => {
    const dismissedAt = 1_000_000;

    expect(
      shouldShowSupportPrompt(
        { dismissedAt, opened: false },
        dismissedAt + SUPPORT_PROMPT_SNOOZE_MS
      )
    ).toBe(true);
  });

  it('猶予期間が過ぎていても、支援ページを開いていれば表示しない', () => {
    const dismissedAt = 1_000_000;

    expect(
      shouldShowSupportPrompt(
        { dismissedAt, opened: true },
        dismissedAt + SUPPORT_PROMPT_SNOOZE_MS * 10
      )
    ).toBe(false);
  });
});

describe('dismissSupportPrompt', () => {
  it('閉じた時刻を保存する', async () => {
    mockGet.mockResolvedValue({ dismissedAt: null, opened: false });

    await dismissSupportPrompt(12_345);

    expect(mockSet).toHaveBeenCalledWith('supportPrompt', {
      dismissedAt: 12_345,
      opened: false
    });
  });

  it('opened の値は保持する', async () => {
    mockGet.mockResolvedValue({ dismissedAt: null, opened: true });

    await dismissSupportPrompt(12_345);

    expect(mockSet).toHaveBeenCalledWith('supportPrompt', {
      dismissedAt: 12_345,
      opened: true
    });
  });
});

describe('markSupportPromptOpened', () => {
  it('opened を立てつつ dismissedAt は保持する', async () => {
    mockGet.mockResolvedValue({ dismissedAt: 500, opened: false });

    await markSupportPromptOpened();

    expect(mockSet).toHaveBeenCalledWith('supportPrompt', {
      dismissedAt: 500,
      opened: true
    });
  });
});

describe('openSupportPage', () => {
  it('Buy Me a Coffee のページを新しいタブで開く', () => {
    openSupportPage();

    expect(mockTabsCreate).toHaveBeenCalledOnce();
    expect(mockTabsCreate).toHaveBeenCalledWith({ url: BUY_ME_A_COFFEE_URL });
  });

  it('URL に外部スクリプトを読み込む要素が含まれていない', () => {
    // MV3 はリモートコードの実行を禁止しているため、素のリンクであることを担保する
    expect(BUY_ME_A_COFFEE_URL).toMatch(/^https:\/\/buymeacoffee\.com\//);
  });
});
