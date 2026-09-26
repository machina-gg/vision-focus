import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getUnblockHistory: vi.fn()
}));

import { getSettings, getUnblockHistory } from '~/lib/storage';
import { getTrackedSiteKeys, trackedSiteKeys } from '~/lib/siteService';
import {
  DEFAULT_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY,
  DEFAULT_YOUTUBE_SETTINGS
} from '~/types/storage';
import type { BlockItem, TrackedSite } from '~/types/storage';

const blockItem = (domain: string): BlockItem => ({
  id: domain,
  domain,
  isWildcard: domain.startsWith('*.'),
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true
});

const historyEntry = (domain: string): TrackedSite => ({
  domain,
  status: 'unblocked',
  blockedAt: '2026-01-01T00:00:00.000Z',
  unblockedAt: '2026-01-02T00:00:00.000Z',
  timeAfterUnblock: 0,
  lastActivity: null
});

function given({
  history = [] as string[],
  blockList = [] as string[],
  youtubeEnabled = false
}) {
  vi.mocked(getUnblockHistory).mockResolvedValue({
    ...DEFAULT_UNBLOCK_HISTORY,
    sites: Object.fromEntries(history.map((d) => [d, historyEntry(d)]))
  });
  vi.mocked(getSettings).mockResolvedValue({
    ...DEFAULT_SETTINGS,
    blockList: blockList.map(blockItem),
    youtube: { ...DEFAULT_YOUTUBE_SETTINGS, enabled: youtubeEnabled }
  });
}

const sorted = (keys: string[]) => [...keys].sort();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTrackedSiteKeys', () => {
  it('何も登録していなければ空', async () => {
    given({});

    expect(await getTrackedSiteKeys()).toEqual([]);
  });

  it('解除履歴のキーとブロックリストのドメインを合わせる', async () => {
    given({ history: ['reddit.com'], blockList: ['x.com'] });

    expect(sorted(await getTrackedSiteKeys())).toEqual(['reddit.com', 'x.com']);
  });

  it('YouTube 機能が有効なら youtube.com を含める', async () => {
    given({ youtubeEnabled: true });

    expect(await getTrackedSiteKeys()).toEqual(['youtube.com']);
  });

  it('YouTube 機能が無効なら youtube.com を含めない', async () => {
    given({ blockList: ['x.com'], youtubeEnabled: false });

    expect(await getTrackedSiteKeys()).toEqual(['x.com']);
  });

  it('ワイルドカード・www・大文字を正規化し、同じサイトは 1 つにまとめる', async () => {
    given({
      history: ['www.Example.com', 'youtube.com'],
      blockList: ['*.example.com', 'example.com'],
      youtubeEnabled: true
    });

    expect(sorted(await getTrackedSiteKeys())).toEqual([
      'example.com',
      'youtube.com'
    ]);
  });

  it('正規化して空になるものは含めない', async () => {
    given({ blockList: ['', 'www.'] });

    expect(await getTrackedSiteKeys()).toEqual([]);
  });
});

describe('trackedSiteKeys', () => {
  it('渡した設定と解除履歴から、保存値を読む getTrackedSiteKeys と同じ集合を作る', async () => {
    given({
      history: ['www.reddit.com'],
      blockList: ['*.x.com'],
      youtubeEnabled: true
    });
    const settings = await getSettings();
    const history = await getUnblockHistory();

    expect(sorted(trackedSiteKeys(settings, history))).toEqual(
      sorted(await getTrackedSiteKeys())
    );
    expect(sorted(trackedSiteKeys(settings, history))).toEqual([
      'reddit.com',
      'x.com',
      'youtube.com'
    ]);
  });
});
