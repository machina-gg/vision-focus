import { describe, expect, it } from 'vitest';

import {
  allowCandidate,
  allowedCountUnder,
  allowedSiteRows,
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

describe('allowedSiteRows', () => {
  it('許可サイトだけをドメイン順に並べ、覆うブロックがあればそのキーを添える', () => {
    const sites = sitesOf(
      blockedSite(YOUTUBE_DOMAIN),
      blockedSite('google.com', { enabled: false }),
      trackedSite('x.com'),
      allowedSite('music.youtube.com', true),
      allowedSite('docs.google.com'),
      allowedSite('example.org')
    );

    expect(allowedSiteRows(sites)).toEqual([
      {
        domain: 'docs.google.com',
        recordTime: false,
        exceptionOf: 'google.com'
      },
      { domain: 'example.org', recordTime: false, exceptionOf: null },
      {
        domain: 'music.youtube.com',
        recordTime: true,
        exceptionOf: YOUTUBE_DOMAIN
      }
    ]);
  });

  it('規則なしの登録と許可サイトは覆うブロックに数えない', () => {
    const sites = sitesOf(
      trackedSite('example.com'),
      allowedSite('google.com'),
      allowedSite('mail.google.com'),
      allowedSite('a.example.com')
    );

    expect(allowedSiteRows(sites).map((row) => row.exceptionOf)).toEqual([
      null,
      null,
      null
    ]);
  });

  it('許可サイトが無ければ空', () => {
    expect(allowedSiteRows(sitesOf(blockedSite('x.com')))).toEqual([]);
  });
});

describe('allowedCountUnder', () => {
  const sites = sitesOf(
    blockedSite(YOUTUBE_DOMAIN),
    allowedSite('music.youtube.com'),
    allowedSite('studio.youtube.com', true),
    allowedSite('notyoutube.com'),
    trackedSite('x.com'),
    blockedSite('x.org')
  );

  it('ブロックの登録の真のサブドメインにある許可サイトを数える', () => {
    expect(allowedCountUnder(sites, YOUTUBE_DOMAIN)).toBe(2);
  });

  it('下に許可サイトが無ければ 0', () => {
    expect(allowedCountUnder(sites, 'x.org')).toBe(0);
  });
});

describe('allowCandidate', () => {
  const sites = sitesOf(
    blockedSite(YOUTUBE_DOMAIN),
    trackedSite('x.com'),
    allowedSite('docs.example.org')
  );

  it.each([
    ['music.youtube.com', 'music.youtube.com'],
    ['Music.YouTube.com', 'music.youtube.com'],
    ['www.m.youtube.com', 'm.youtube.com']
  ])('%s はブロックした登録の真のサブドメインなので %s を返す', (host, key) => {
    expect(allowCandidate(host, sites)).toBe(key);
  });

  it.each([
    ['ブロックした登録そのもの', 'youtube.com'],
    ['www. 付きのブロックした登録', 'www.youtube.com'],
    ['規則なしの登録の下', 'a.x.com'],
    ['どの登録にも覆われない', 'example.com'],
    ['許可サイトの下（ブロックの登録が無い）', 'a.docs.example.org'],
    ['空', '']
  ])('%s なら null', (_label, host) => {
    expect(allowCandidate(host, sites)).toBeNull();
  });
});
