import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * 解除の 3 経路（トグル OFF・ブロックリストからの削除・YouTube のアクセスブロック OFF）で、
 * 事実の表（activity）に `unblock` が実際に保存されることを確かめる。
 *
 * ハンドラ単体のテストは記録の入口（`recordActivity`）をモックするため「呼ばれたか」までしか
 * 見られない。書き手は追跡中の集合に無いキーの出来事を捨てるので、呼んだ時点の保存値に
 * よっては黙って消える。ここでは書き手と追跡中のサイト（`siteService`）を実物のまま通し、
 * 保存領域だけをインメモリの実体に差し替えて、保存された値そのものを見る。
 */

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
import type { YouTubeSectionValue } from '~/lib/siteSelectors';
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
  overrides: Partial<YouTubeSectionValue> = {}
): YouTubeSectionValue => ({
  enabled: true,
  blockAccess: false,
  hideShorts: false,
  hideRecommendations: false,
  hideComments: false,
  hideHomeFeed: false,
  timeLimit: null,
  ...overrides
});

/** YouTube 機能とアクセスブロックが両方有効な youtube.com */
const blockingYouTube = () =>
  blockedSite('youtube.com', {}, { youtube: youtubeFeatures() });

/** 今日の行に記録された解除回数（行が無ければ undefined） */
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
