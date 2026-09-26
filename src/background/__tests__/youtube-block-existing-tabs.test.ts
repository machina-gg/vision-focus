import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * YouTube のアクセスブロックを OFF→ON にしたとき、開いている YouTube のタブが
 * newtab に置き換わることを固定するテスト（#392）。
 *
 * ハンドラ単体のテスト（handlers/update-youtube-settings.test.ts）は blocker を
 * モックするため「blockExistingTabs() が呼ばれたか」までしか見られない。ここでは
 * blocker と blockService を実物のまま通し、chrome.tabs への指示を検証する
 */

// ストレージだけをモックする（blocker / blockService は実物）
vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getSites: vi.fn(),
  sitesItem: { setValue: vi.fn() },
  activityItem: { getValue: vi.fn() },
  // blockExistingTabs はリダイレクト前にブロックを記録する（#351）
  setLastBlockedDomain: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  isExtensionContextValid: vi.fn(() => true)
}));

// 事実の表（activity）への記録はこの検査の対象外（タブの置き換えを見る）
vi.mock('~/lib/activityService', () => ({
  recordActivity: vi.fn(),
  recordHostActivity: vi.fn()
}));

import {
  getSettings,
  getSites,
  sitesItem,
  activityItem,
  setLastBlockedDomain
} from '~/lib/storage';
import { recordHostActivity } from '~/lib/activityService';
import { updateYouTubeSettingsHandler } from '../handlers/update-youtube-settings';
import { invoke } from './handlers/helpers';
import { toDateKey } from '~/lib/time';
import { DEFAULT_SETTINGS } from '~/types/storage';
import type { TimeLimit } from '~/types/storage';
import type { TrackedSites } from '~/types/site';
import { sitesOf, trackedSite, youtubeFeatures } from '~/test/sites';

const YOUTUBE_TAB = { id: 1, url: 'https://www.youtube.com/watch?v=abc' };
const OTHER_TAB = { id: 2, url: 'https://example.com/' };
const NEWTAB_URL = 'chrome-extension://test-id/newtab.html';

/** chrome API のモックを構築する */
function setupChrome() {
  const chromeMock = {
    declarativeNetRequest: {
      getDynamicRules: vi.fn().mockResolvedValue([]),
      updateDynamicRules: vi.fn().mockResolvedValue(undefined),
      RuleActionType: { REDIRECT: 'redirect' },
      ResourceType: { MAIN_FRAME: 'main_frame' }
    },
    tabs: {
      query: vi.fn().mockResolvedValue([YOUTUBE_TAB, OTHER_TAB]),
      update: vi.fn().mockResolvedValue(undefined)
    },
    runtime: {
      id: 'test-extension-id',
      getURL: vi.fn(
        (path: string) =>
          `chrome-extension://test-id/${path.replace(/^\//, '')}`
      )
    }
  };
  (globalThis as Record<string, unknown>).chrome = chromeMock;
  return chromeMock;
}

/**
 * 保存前の追跡中のサイト（YouTube 機能は有効・アクセスブロックは無効）を用意し、
 * 保存された値が以降の判定に反映されるようにする
 */
function givenStoredSites() {
  let stored: TrackedSites = sitesOf(
    trackedSite('youtube.com', { youtube: youtubeFeatures() })
  );
  vi.mocked(getSettings).mockResolvedValue(DEFAULT_SETTINGS);
  vi.mocked(getSites).mockImplementation(async () => stored);
  vi.mocked(sitesItem.setValue).mockImplementation(
    async (next: TrackedSites) => {
      stored = next;
    }
  );
}

/** YouTube の今日の表示秒数を用意する（サイトキーは 'youtube.com'） */
function givenYouTubeUsage(seconds: number) {
  vi.mocked(activityItem.getValue).mockResolvedValue({
    [toDateKey(new Date())]: {
      'youtube.com': { seconds, blocks: 0, unblocks: 0 }
    }
  });
}

/** アクセスブロックを ON にする（必要なら時間制限つきで） */
async function turnOnBlockAccess(timeLimit: TimeLimit | null = null) {
  return invoke(updateYouTubeSettingsHandler, {
    youtube: {
      enabled: true,
      blockAccess: true,
      hideShorts: false,
      hideRecommendations: false,
      hideComments: false,
      hideHomeFeed: false,
      timeLimit
    }
  });
}

describe('YouTube のアクセスブロック ON で開いているタブが置き換わる', () => {
  let chromeMock: ReturnType<typeof setupChrome>;

  beforeEach(() => {
    vi.clearAllMocks();
    chromeMock = setupChrome();
    vi.mocked(activityItem.getValue).mockResolvedValue({});
    givenStoredSites();
  });

  it('時間制限なしなら、開いている YouTube のタブを newtab へ置き換える', async () => {
    await turnOnBlockAccess();

    expect(chromeMock.tabs.update).toHaveBeenCalledWith(YOUTUBE_TAB.id, {
      url: `${NEWTAB_URL}?reason=always_blocked`
    });
  });

  it('置き換えたタブのブロックを記録する（ブロック画面の帯の表示元）', async () => {
    // 置き換え経路では元ドメインの webNavigation イベントが発生しないため、
    // ここで記録しないと帯に出す「最後にブロックしたドメイン」が残らない（#351）
    await turnOnBlockAccess();

    expect(setLastBlockedDomain).toHaveBeenCalledWith('www.youtube.com');
    expect(recordHostActivity).toHaveBeenCalledWith(
      ['www.youtube.com'],
      expect.any(Function)
    );
  });

  it('置き換えないタブのブロックは記録しない', async () => {
    givenYouTubeUsage(30);

    await turnOnBlockAccess({ type: 'daily', limitSeconds: 60 });

    expect(setLastBlockedDomain).not.toHaveBeenCalled();
    expect(recordHostActivity).not.toHaveBeenCalled();
  });

  it('YouTube 以外のタブは置き換えない', async () => {
    await turnOnBlockAccess();

    expect(chromeMock.tabs.update).toHaveBeenCalledOnce();
  });

  it('時間制限が未超過なら、開いているタブを置き換えない', async () => {
    givenYouTubeUsage(30);

    await turnOnBlockAccess({ type: 'daily', limitSeconds: 60 });

    expect(chromeMock.tabs.update).not.toHaveBeenCalled();
  });

  it('時間制限を超過していれば、超過を理由に置き換える', async () => {
    givenYouTubeUsage(120);

    await turnOnBlockAccess({ type: 'daily', limitSeconds: 60 });

    expect(chromeMock.tabs.update).toHaveBeenCalledWith(YOUTUBE_TAB.id, {
      url: `${NEWTAB_URL}?reason=time_limit_exceeded`
    });
  });

  it('ブロックルールも同じ条件で生成される（未超過なら YouTube を含めない）', async () => {
    givenYouTubeUsage(30);

    await turnOnBlockAccess({ type: 'daily', limitSeconds: 60 });

    const calls =
      chromeMock.declarativeNetRequest.updateDynamicRules.mock.calls;
    const arg = calls[calls.length - 1][0] as {
      addRules: chrome.declarativeNetRequest.Rule[];
    };
    expect(arg.addRules).toEqual([]);
  });

  it('ブロックルールも同じ条件で生成される（超過なら YouTube を含める）', async () => {
    givenYouTubeUsage(120);

    await turnOnBlockAccess({ type: 'daily', limitSeconds: 60 });

    const calls =
      chromeMock.declarativeNetRequest.updateDynamicRules.mock.calls;
    const arg = calls[calls.length - 1][0] as {
      addRules: chrome.declarativeNetRequest.Rule[];
    };
    // ||youtube.com は www. を含むすべてのサブドメインを止める
    expect(arg.addRules.map((rule) => rule.condition?.urlFilter)).toEqual([
      '||youtube.com'
    ]);
  });
});
