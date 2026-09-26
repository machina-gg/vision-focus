import { describe, expect, it } from 'vitest';

import { blockListSites, hasBlock } from '~/lib/blockList';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';

const LIMIT = { type: 'daily' as const, limitSeconds: 600 };

describe('hasBlock', () => {
  it('ブロック設定の有無で分ける（無効のブロック設定もブロック設定あり）', () => {
    expect(hasBlock(trackedSite('a.com'))).toBe(false);
    expect(hasBlock(blockedSite('a.com'))).toBe(true);
    expect(hasBlock(blockedSite('a.com', { enabled: false }))).toBe(true);
  });
});

describe('blockListSites', () => {
  it('ブロック設定を持つサイトを追加した順に並べる（追跡だけのサイトは出さない）', () => {
    const off = blockedSite('a.com', {
      addedAt: '2026-01-01T00:00:00.000Z',
      enabled: false,
      timeLimit: LIMIT
    });
    const on = blockedSite('b.com', { addedAt: '2026-02-01T00:00:00.000Z' });
    const sites = sitesOf(on, trackedSite('tracked.com'), off);

    expect(blockListSites(sites)).toEqual([off, on]);
  });

  it('追加した時刻が同じならサイトキー順に並べる（保存順に左右されない）', () => {
    const sites = sitesOf(blockedSite('z.com'), blockedSite('m.com'));
    expect(blockListSites(sites).map((site) => site.domain)).toEqual([
      'm.com',
      'z.com'
    ]);
  });

  it('youtube.com は YouTube の節が担当するので、ブロック設定を持っていても並べない', () => {
    const sites = sitesOf(
      blockedSite(YOUTUBE_DOMAIN, {}, { youtube: youtubeFeatures() }),
      blockedSite('x.com')
    );
    expect(blockListSites(sites).map((site) => site.domain)).toEqual(['x.com']);
  });
});
