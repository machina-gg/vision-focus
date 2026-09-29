import { describe, expect, it } from 'vitest';

import {
  blockListSites,
  hasBlock,
  isAllowedHost,
  isAllowedSite
} from '~/lib/blockList';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import {
  allowedSite,
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';

const LIMIT = { type: 'daily' as const, limitSeconds: 600 };

describe('hasBlock / isAllowedSite', () => {
  it('規則の種類で分ける（無効のブロックもブロックの規則あり）', () => {
    expect(hasBlock(trackedSite('a.com'))).toBe(false);
    expect(hasBlock(blockedSite('a.com'))).toBe(true);
    expect(hasBlock(blockedSite('a.com', { enabled: false }))).toBe(true);
    expect(hasBlock(allowedSite('a.com'))).toBe(false);
    expect(isAllowedSite(allowedSite('a.com'))).toBe(true);
    expect(isAllowedSite(blockedSite('a.com'))).toBe(false);
    expect(isAllowedSite(trackedSite('a.com'))).toBe(false);
  });
});

describe('isAllowedHost', () => {
  const sites = sitesOf(
    blockedSite(YOUTUBE_DOMAIN),
    allowedSite('music.youtube.com'),
    trackedSite('x.com')
  );

  it.each([
    ['許可サイトそのもの', 'music.youtube.com', true],
    ['許可サイトの下のホスト', 'a.music.youtube.com', true],
    ['許可サイトの外の親のホスト', 'www.youtube.com', false],
    ['規則なしのサイト', 'x.com', false],
    ['どれにも属さないホスト', 'example.com', false]
  ])('%s（%s）なら %s', (_label, host, expected) => {
    expect(isAllowedHost(host, sites)).toBe(expected);
  });
});

describe('blockListSites', () => {
  it('ブロックの規則を持つサイトを追加した順に並べる（追跡だけ・許可サイトは出さない）', () => {
    const off = blockedSite('a.com', {
      addedAt: '2026-01-01T00:00:00.000Z',
      enabled: false,
      timeLimit: LIMIT
    });
    const on = blockedSite('b.com', { addedAt: '2026-02-01T00:00:00.000Z' });
    const sites = sitesOf(
      on,
      trackedSite('tracked.com'),
      allowedSite('allowed.b.com'),
      off
    );

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
