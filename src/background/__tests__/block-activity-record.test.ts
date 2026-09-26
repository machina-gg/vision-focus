import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * ブロックが成立したとき、事実の表（activity）に `block` が 1 回だけ記録されることを、
 * 記録が始まる 2 つの経路それぞれで確かめる。
 * - `webNavigation.onBeforeNavigate`（navigationTracking）
 * - `blockExistingTabs`（設定変更で既に開いているタブを飛ばす経路）
 *
 * 経路ごとの単体テストは `recordBlockedDomain` をモックするため「呼ばれたか」までしか
 * 見られない。ここでは経路と `recordBlockedDomain` を実物のまま通し、書き手
 * （`appendActivity`）に届いた出来事を数える。
 */

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn(),
  incrementSiteBlockCount: vi.fn(),
  setLastBlockedDomain: vi.fn()
}));

vi.mock('~/lib/blockService', () => ({
  getBlockState: vi.fn(),
  getActiveBlockedDomains: vi.fn(),
  findBlockItemForDomain: vi.fn(),
  shouldTrackBlockForDomain: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  isExtensionContextValid: vi.fn(() => true)
}));

vi.mock('~/lib/siteService', () => ({
  getTrackedSiteKeys: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  appendActivity: vi.fn()
}));

import { getAnalytics } from '~/lib/storage';
import { getBlockState, shouldTrackBlockForDomain } from '~/lib/blockService';
import { getTrackedSiteKeys } from '~/lib/siteService';
import { appendActivity } from '~/lib/activityService';
import { blockExistingTabs } from '../blocker';
import { setupNavigationTracking } from '../listeners/navigationTracking';
import { DEFAULT_ANALYTICS } from '~/types/storage';

type NavigateListener = (
  details: chrome.webNavigation.WebNavigationParentedCallbackDetails
) => Promise<void>;

/** chrome API のモック。遷移リスナーを捕捉し、開いているタブを差し替えられる */
function setupChrome(tabs: chrome.tabs.Tab[] = []) {
  let listener: NavigateListener | null = null;

  (globalThis as Record<string, unknown>).chrome = {
    runtime: {
      id: 'test-extension-id',
      getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`)
    },
    tabs: {
      query: vi.fn().mockResolvedValue(tabs),
      update: vi.fn().mockResolvedValue(undefined)
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

const blockEvent = (site: string) => ({
  kind: 'block',
  site,
  at: expect.any(Date)
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAnalytics).mockResolvedValue({
    ...DEFAULT_ANALYTICS,
    dailyStats: {}
  });
  vi.mocked(getTrackedSiteKeys).mockResolvedValue(['youtube.com']);
  vi.mocked(shouldTrackBlockForDomain).mockResolvedValue(true);
  vi.mocked(getBlockState).mockResolvedValue({ blocked: true, reason: null });
});

describe('ブロック成立時の事実の記録', () => {
  it('遷移イベントの経路で 1 回だけ記録する', async () => {
    const harness = setupChrome();
    setupNavigationTracking();

    await harness.navigate('https://www.youtube.com/watch?v=abc');

    expect(vi.mocked(appendActivity).mock.calls).toEqual([
      [blockEvent('youtube.com')]
    ]);
  });

  it('既存タブを飛ばす経路で 1 回だけ記録する', async () => {
    setupChrome([
      { id: 1, url: 'https://www.youtube.com/watch?v=abc' } as chrome.tabs.Tab
    ]);

    await blockExistingTabs();

    expect(vi.mocked(appendActivity).mock.calls).toEqual([
      [blockEvent('youtube.com')]
    ]);
  });

  it('既存タブを飛ばす経路では、飛ばしたタブの数だけ記録する', async () => {
    setupChrome([
      { id: 1, url: 'https://www.youtube.com/watch?v=a' } as chrome.tabs.Tab,
      { id: 2, url: 'https://m.youtube.com/watch?v=b' } as chrome.tabs.Tab
    ]);

    await blockExistingTabs();

    expect(vi.mocked(appendActivity).mock.calls).toEqual([
      [blockEvent('youtube.com')],
      [blockEvent('youtube.com')]
    ]);
  });

  it('ブロックが成立しなければどちらの経路でも記録しない', async () => {
    vi.mocked(shouldTrackBlockForDomain).mockResolvedValue(false);
    vi.mocked(getBlockState).mockResolvedValue({
      blocked: false,
      reason: null
    });
    const harness = setupChrome([
      { id: 1, url: 'https://www.youtube.com/' } as chrome.tabs.Tab
    ]);
    setupNavigationTracking();

    await harness.navigate('https://www.youtube.com/');
    await blockExistingTabs();

    expect(appendActivity).not.toHaveBeenCalled();
  });
});
