import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * ブロックが成立したとき、事実の表（activity）に `block` が 1 回だけ保存されることを、
 * 記録が始まる 2 つの経路それぞれで確かめる。
 * - `webNavigation.onBeforeNavigate`（navigationTracking）
 * - `blockExistingTabs`（設定変更で既に開いているタブを飛ばす経路）
 *
 * 経路ごとの単体テストは `recordBlockedDomain` をモックするため「呼ばれたか」までしか
 * 見られない。ここでは経路・`recordBlockedDomain`・書き手（activityService）を実物のまま通し、
 * 保存領域だけをインメモリの実体に差し替えて、保存された値そのものを数える。
 */

const activityStore = vi.hoisted(() => ({
  value: undefined as unknown,
  failWrites: false
}));

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setLastBlockedDomain: vi.fn(),
  activityItem: {
    getValue: vi.fn(async () => structuredClone(activityStore.value ?? {})),
    setValue: vi.fn(async (value: unknown) => {
      if (activityStore.failWrites) throw new Error('write failed');
      activityStore.value = structuredClone(value);
    }),
    removeValue: vi.fn()
  }
}));

vi.mock('~/lib/blockService', () => ({
  getBlockState: vi.fn(),
  getActiveBlockedDomains: vi.fn(),
  shouldTrackBlockForDomain: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  isExtensionContextValid: vi.fn(() => true)
}));

vi.mock('~/lib/siteService', () => ({
  getTrackedSiteKeys: vi.fn()
}));

import { getBlockState, shouldTrackBlockForDomain } from '~/lib/blockService';
import { getTrackedSiteKeys } from '~/lib/siteService';
import { toDateKey } from '~/lib/time';
import { blockExistingTabs } from '../blocker';
import { setupNavigationTracking } from '../listeners/navigationTracking';
import type { ActivityLog } from '~/types/activity';

type NavigateListener = (
  details: chrome.webNavigation.WebNavigationParentedCallbackDetails
) => Promise<void>;

/** chrome API のモック。遷移リスナーを捕捉し、開いているタブを差し替えられる */
function setupChrome(tabs: chrome.tabs.Tab[] = []) {
  let listener: NavigateListener | null = null;
  const update = vi.fn().mockResolvedValue(undefined);

  (globalThis as Record<string, unknown>).chrome = {
    runtime: {
      id: 'test-extension-id',
      getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`)
    },
    tabs: {
      query: vi.fn().mockResolvedValue(tabs),
      update
    },
    webNavigation: {
      onBeforeNavigate: {
        addListener: vi.fn((fn: NavigateListener) => {
          listener = fn;
        })
      }
    }
  };

  return {
    update,
    navigate: async (url: string) => {
      if (!listener) throw new Error('リスナーが未登録');
      await listener({
        url,
        frameId: 0,
        tabId: 1
      } as chrome.webNavigation.WebNavigationParentedCallbackDetails);
    }
  };
}

/** 今日の行に保存されたブロック回数（行が無ければ undefined） */
function todayBlocks(site: string): number | undefined {
  const log = activityStore.value as ActivityLog | undefined;
  return log?.[toDateKey(new Date())]?.[site]?.blocks;
}

const tab = (id: number, url: string) => ({ id, url }) as chrome.tabs.Tab;

beforeEach(() => {
  vi.clearAllMocks();
  activityStore.value = undefined;
  activityStore.failWrites = false;
  vi.mocked(getTrackedSiteKeys).mockResolvedValue(['youtube.com']);
  vi.mocked(shouldTrackBlockForDomain).mockResolvedValue(true);
  vi.mocked(getBlockState).mockResolvedValue({ blocked: true, reason: null });
});

describe('ブロック成立時の事実の記録', () => {
  it('遷移イベントの経路で 1 回だけ記録する', async () => {
    const harness = setupChrome();
    setupNavigationTracking();

    await harness.navigate('https://www.youtube.com/watch?v=abc');

    expect(todayBlocks('youtube.com')).toBe(1);
  });

  it('既存タブを飛ばす経路で 1 回だけ記録する', async () => {
    setupChrome([tab(1, 'https://www.youtube.com/watch?v=abc')]);

    await blockExistingTabs();

    expect(todayBlocks('youtube.com')).toBe(1);
  });

  it('既存タブを飛ばす経路では、飛ばしたタブの数だけ記録する', async () => {
    setupChrome([
      tab(1, 'https://www.youtube.com/watch?v=a'),
      tab(2, 'https://m.youtube.com/watch?v=b')
    ]);

    await blockExistingTabs();

    expect(todayBlocks('youtube.com')).toBe(2);
  });

  it('ブロックが成立しなければどちらの経路でも記録しない', async () => {
    vi.mocked(shouldTrackBlockForDomain).mockResolvedValue(false);
    vi.mocked(getBlockState).mockResolvedValue({
      blocked: false,
      reason: null
    });
    const harness = setupChrome([tab(1, 'https://www.youtube.com/')]);
    setupNavigationTracking();

    await harness.navigate('https://www.youtube.com/');
    await blockExistingTabs();

    expect(activityStore.value).toBeUndefined();
  });

  it('事実の記録に失敗しても、既存タブのリダイレクトは行う', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    activityStore.failWrites = true;
    const harness = setupChrome([tab(1, 'https://www.youtube.com/')]);

    await blockExistingTabs();

    expect(harness.update).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
