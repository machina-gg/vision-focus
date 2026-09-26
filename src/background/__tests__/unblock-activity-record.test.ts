import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * 解除の 3 経路（トグル OFF・ブロックリストからの削除・YouTube のアクセスブロック OFF）で、
 * 事実の表（activity）に `unblock` が実際に保存されることを確かめる。
 *
 * ハンドラ単体のテストは書き手（`appendActivity`）をモックするため「呼ばれたか」までしか
 * 見られない。書き手は追跡中の集合に無いキーの出来事を捨てるので、呼んだ時点の保存値に
 * よっては黙って消える。ここでは書き手と追跡中の集合（`siteService`）を実物のまま通し、
 * 保存領域だけをインメモリの実体に差し替えて、保存された値そのものを見る。
 */

const store = vi.hoisted(() => ({
  settings: undefined as unknown,
  unblockHistory: undefined as unknown,
  analytics: undefined as unknown,
  activity: undefined as unknown
}));

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(async () => structuredClone(store.settings)),
  setSettings: vi.fn(async (value: unknown) => {
    store.settings = structuredClone(value);
  }),
  getUnblockHistory: vi.fn(async () => structuredClone(store.unblockHistory)),
  setUnblockHistory: vi.fn(async (value: unknown) => {
    store.unblockHistory = structuredClone(value);
  }),
  getAnalytics: vi.fn(async () => structuredClone(store.analytics)),
  setAnalytics: vi.fn(async (value: unknown) => {
    store.analytics = structuredClone(value);
  }),
  activityItem: {
    getValue: vi.fn(async () => structuredClone(store.activity ?? {})),
    setValue: vi.fn(async (value: unknown) => {
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
import {
  DEFAULT_ANALYTICS,
  DEFAULT_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY,
  DEFAULT_YOUTUBE_SETTINGS
} from '~/types/storage';
import type { AppSettings, BlockItem } from '~/types/storage';
import type { ActivityLog } from '~/types/activity';

const blockItem: BlockItem = {
  id: 'item-1',
  domain: '*.example.com',
  isWildcard: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true
};

function givenSettings(overrides: Partial<AppSettings>) {
  store.settings = { ...DEFAULT_SETTINGS, ...overrides };
}

/** 今日の行に記録された解除回数（行が無ければ undefined） */
function todayUnblocks(site: string): number | undefined {
  const log = store.activity as ActivityLog | undefined;
  return log?.[toDateKey(new Date())]?.[site]?.unblocks;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.settings = structuredClone(DEFAULT_SETTINGS);
  store.unblockHistory = { ...DEFAULT_UNBLOCK_HISTORY, sites: {} };
  store.analytics = {
    ...DEFAULT_ANALYTICS,
    dailyStats: {},
    siteUnblockCounts: {}
  };
  store.activity = undefined;
});

describe('解除の事実が保存される', () => {
  it('トグル OFF', async () => {
    givenSettings({ blockList: [blockItem] });

    await invoke(toggleBlockHandler, { id: 'item-1', enabled: false });

    expect(todayUnblocks('example.com')).toBe(1);
  });

  it('ブロックリストからの削除（解除履歴に残るので追跡は続く）', async () => {
    givenSettings({ blockList: [blockItem] });

    await invoke(removeBlockHandler, { id: 'item-1' });

    expect(todayUnblocks('example.com')).toBe(1);
  });

  it('YouTube のアクセスブロックだけを OFF にしたとき', async () => {
    givenSettings({
      youtube: { ...DEFAULT_YOUTUBE_SETTINGS, enabled: true, blockAccess: true }
    });

    await invoke(updateYouTubeSettingsHandler, {
      youtube: {
        ...DEFAULT_YOUTUBE_SETTINGS,
        enabled: true,
        blockAccess: false
      }
    });

    expect(todayUnblocks('youtube.com')).toBe(1);
  });

  it('YouTube 機能ごと無効にしたとき（解除履歴に youtube.com が無くても）', async () => {
    // 追跡中の集合は保存後の設定では youtube.com を含まない。
    // 保存前に記録していないと、この出来事は書き手に捨てられる
    givenSettings({
      youtube: { ...DEFAULT_YOUTUBE_SETTINGS, enabled: true, blockAccess: true }
    });

    await invoke(updateYouTubeSettingsHandler, {
      youtube: {
        ...DEFAULT_YOUTUBE_SETTINGS,
        enabled: false,
        blockAccess: true
      }
    });

    expect(todayUnblocks('youtube.com')).toBe(1);
  });
});
