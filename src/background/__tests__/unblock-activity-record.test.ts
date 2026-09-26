import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ハンドラ単体のテストは recordActivity をモックし、書き手は追跡中に無いキーを黙って捨てるため、ここでは書き手と siteService を実物のまま通して保存値を見る
const store = vi.hoisted(() => ({
  sites: undefined as unknown,
  activity: undefined as unknown,
  failActivityWrites: false
}));

vi.mock('~/lib/storage', () => ({
  getSites: vi.fn(async () => structuredClone(store.sites ?? {})),
  sitesItem: {
    setValue: vi.fn(async (value: unknown) => {
      store.sites = structuredClone(value);
    })
  },
  activityItem: {
    getValue: vi.fn(async () => structuredClone(store.activity ?? {})),
    setValue: vi.fn(async (value: unknown) => {
      if (store.failActivityWrites) throw new Error('write failed');
      store.activity = structuredClone(value);
    }),
    removeValue: vi.fn(async () => {
      store.activity = undefined;
    })
  }
}));

vi.mock('../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

vi.mock('~/lib/analytics', () => ({
  trackEvent: vi.fn()
}));

import { toggleBlockHandler } from '../handlers/toggle-block';
import { removeBlockHandler } from '../handlers/remove-block';
import { updateYouTubeSettingsHandler } from '../handlers/update-youtube-settings';
import { invoke } from './handlers/helpers';
import { toDateKey } from '~/lib/time';
import type { YouTubeSettingsInput } from '~/types/messageSchemas';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';
import type { ActivityLog } from '~/types/activity';
import type { TrackedSite, TrackedSites } from '~/types/site';

function givenSites(...sites: TrackedSite[]) {
  store.sites = sitesOf(...sites);
}

const storedSites = () => store.sites as TrackedSites;

const youtube = (
  overrides: Partial<YouTubeSettingsInput> = {}
): YouTubeSettingsInput => ({
  enabled: true,
  blockAccess: false,
  hideShorts: false,
  hideRecommendations: false,
  hideComments: false,
  hideHomeFeed: false,
  timeLimit: null,
  ...overrides
});

const blockingYouTube = () =>
  blockedSite('youtube.com', {}, { youtube: youtubeFeatures() });

function todayUnblocks(site: string): number | undefined {
  const log = store.activity as ActivityLog | undefined;
  return log?.[toDateKey(new Date())]?.[site]?.unblocks;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.sites = undefined;
  store.activity = undefined;
  store.failActivityWrites = false;
});

describe('解除の事実が保存される', () => {
  it('トグル OFF', async () => {
    givenSites(blockedSite('example.com'));

    await invoke(toggleBlockHandler, { domain: 'example.com', enabled: false });

    expect(todayUnblocks('example.com')).toBe(1);
  });

  it('ブロックリストからの削除（サイトは追跡中に残る）', async () => {
    givenSites(blockedSite('example.com'));

    await invoke(removeBlockHandler, { domain: 'example.com' });

    expect(todayUnblocks('example.com')).toBe(1);
    expect(storedSites()['example.com'].block).toBeNull();
  });

  it('YouTube のアクセスブロックだけを OFF にしたとき', async () => {
    givenSites(blockingYouTube());

    await invoke(updateYouTubeSettingsHandler, {
      youtube: youtube({ blockAccess: false })
    });

    expect(todayUnblocks('youtube.com')).toBe(1);
    // ブロック設定は無効になるだけで残る（ON に戻せば時間制限ごと復元される）
    expect(storedSites()['youtube.com'].block?.enabled).toBe(false);
  });

  it('無効化済みのアクセスブロックで機能ごと無効にしても解除は数えない', async () => {
    givenSites(
      blockedSite(
        'youtube.com',
        { enabled: false },
        { youtube: youtubeFeatures() }
      )
    );

    await invoke(updateYouTubeSettingsHandler, {
      youtube: youtube({ enabled: false })
    });

    expect(todayUnblocks('youtube.com')).toBeUndefined();
    expect(storedSites()['youtube.com'].block).toBeNull();
  });

  it('YouTube 機能ごと無効にしたとき（保存の後でも youtube.com は追跡中に残る）', async () => {
    givenSites(blockingYouTube());

    await invoke(updateYouTubeSettingsHandler, {
      youtube: youtube({ enabled: false, blockAccess: true })
    });

    expect(todayUnblocks('youtube.com')).toBe(1);
    expect(storedSites()['youtube.com']).toMatchObject({
      block: null,
      youtube: null
    });
  });
});

describe('効いていないブロックを外す操作は解除として数えない', () => {
  it('トグル OFF → 削除でも解除は 1 回', async () => {
    givenSites(blockedSite('example.com'));

    await invoke(toggleBlockHandler, { domain: 'example.com', enabled: false });
    await invoke(removeBlockHandler, { domain: 'example.com' });

    expect(todayUnblocks('example.com')).toBe(1);
  });

  it('無効化済みの項目の削除は 0 回', async () => {
    givenSites(blockedSite('example.com', { enabled: false }));

    await invoke(removeBlockHandler, { domain: 'example.com' });

    expect(todayUnblocks('example.com')).toBeUndefined();
  });

  it('アクセスブロックが OFF の状態で YouTube 機能を無効にしても 0 回', async () => {
    givenSites(trackedSite('youtube.com', { youtube: youtubeFeatures() }));

    await invoke(updateYouTubeSettingsHandler, {
      youtube: youtube({ enabled: false })
    });

    expect(todayUnblocks('youtube.com')).toBeUndefined();
    // ブロック設定の無い youtube.com でも、機能を外した行は追跡中に残る
    expect(storedSites()['youtube.com']).toMatchObject({
      block: null,
      youtube: null
    });
  });
});

describe('事実の記録に失敗しても、本体の操作は成功する', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    store.failActivityWrites = true;
    consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('トグル OFF', async () => {
    givenSites(blockedSite('example.com'));

    const result = await invoke(toggleBlockHandler, {
      domain: 'example.com',
      enabled: false
    });

    expect(result).toEqual({ success: true });
    expect(storedSites()['example.com'].block?.enabled).toBe(false);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it('ブロックリストからの削除', async () => {
    givenSites(blockedSite('example.com'));

    const result = await invoke(removeBlockHandler, { domain: 'example.com' });

    expect(result).toEqual({ success: true });
    expect(storedSites()['example.com'].block).toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it('YouTube のアクセスブロック OFF', async () => {
    givenSites(blockingYouTube());

    const result = await invoke(updateYouTubeSettingsHandler, {
      youtube: youtube({ enabled: false, blockAccess: true })
    });

    expect(result).toEqual({ success: true });
    expect(storedSites()['youtube.com'].youtube).toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
