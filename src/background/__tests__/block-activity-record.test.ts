import { describe, expect, it, vi, beforeEach } from 'vitest';

// 経路ごとの単体テストは recordBlockedDomain をモックするため、ここでは経路と書き手を実物のまま通して保存された値を数える

const activityStore = vi.hoisted(() => ({
  value: undefined as unknown,
  failWrites: false
}));

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setLastBlocked: vi.fn(),
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
  getBlockStateForDomain: vi.fn(),
  getRuleTargets: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  isExtensionContextValid: vi.fn(() => true)
}));

// 記録を OFF にした許可サイトはこのテストに無いので、記録してよいサイトは追跡中のサイトと同じ
vi.mock('~/lib/siteService', () => {
  const getTrackedSiteKeys = vi.fn();
  return {
    getTrackedSiteKeys,
    getRecordableSiteKeys: vi.fn(() => getTrackedSiteKeys())
  };
});

import { getBlockState, getBlockStateForDomain } from '~/lib/blockService';
import { setLastBlocked } from '~/lib/storage';
import { getTrackedSiteKeys } from '~/lib/siteService';
import { toDateKey } from '~/lib/time';
import { blockExistingTabs } from '../blocker';
import { setupNavigationTracking } from '../listeners/navigationTracking';
import type { ActivityLog } from '~/types/activity';

type NavigateListener = (
  details: chrome.webNavigation.WebNavigationParentedCallbackDetails
) => Promise<void>;

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
  const blocked = { blocked: true, reason: 'always_blocked' } as const;
  vi.mocked(getBlockStateForDomain).mockResolvedValue(blocked);
  vi.mocked(getBlockState).mockResolvedValue(blocked);
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

  it('遷移イベントの経路では、ブロック画面用にドメインと時間制限の理由を残す', async () => {
    vi.mocked(getBlockStateForDomain).mockResolvedValue({
      blocked: true,
      reason: 'time_limit_exceeded',
      remainingSeconds: 0
    });
    const harness = setupChrome();
    setupNavigationTracking();

    await harness.navigate('https://www.youtube.com/watch?v=abc');

    expect(setLastBlocked).toHaveBeenCalledWith({
      domain: 'www.youtube.com',
      reason: 'time_limit_exceeded'
    });
  });

  it('既存タブを飛ばす経路では、ブロック画面用にドメインと時間制限の理由を残す', async () => {
    vi.mocked(getBlockState).mockResolvedValue({
      blocked: true,
      reason: 'time_limit_exceeded',
      remainingSeconds: 0
    });
    setupChrome([tab(1, 'https://www.youtube.com/watch?v=abc')]);

    await blockExistingTabs();

    expect(setLastBlocked).toHaveBeenCalledWith({
      domain: 'www.youtube.com',
      reason: 'time_limit_exceeded'
    });
  });

  it('ブロックが成立しなければどちらの経路でも記録しない', async () => {
    const notBlocked = { blocked: false, reason: null } as const;
    vi.mocked(getBlockStateForDomain).mockResolvedValue(notBlocked);
    vi.mocked(getBlockState).mockResolvedValue(notBlocked);
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
