import { describe, expect, it } from 'vitest';

import {
  selectBlockList,
  selectTrackedSiteRows,
  selectYouTubeSection
} from '~/lib/siteSelectors';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';

const LIMIT = { type: 'daily' as const, limitSeconds: 600 };

describe('selectBlockList', () => {
  it('ブロック設定を持つサイトを追加した順に並べる（追跡だけのサイトは出さない）', () => {
    const sites = sitesOf(
      blockedSite('b.com', { addedAt: '2026-02-01T00:00:00.000Z' }),
      trackedSite('tracked.com'),
      blockedSite('a.com', {
        addedAt: '2026-01-01T00:00:00.000Z',
        enabled: false,
        timeLimit: LIMIT
      })
    );

    expect(selectBlockList(sites)).toEqual([
      {
        id: 'a.com',
        domain: 'a.com',
        createdAt: '2026-01-01T00:00:00.000Z',
        enabled: false,
        timeLimit: LIMIT
      },
      {
        id: 'b.com',
        domain: 'b.com',
        createdAt: '2026-02-01T00:00:00.000Z',
        enabled: true,
        timeLimit: null
      }
    ]);
  });

  it('youtube.com は YouTube の節が担当するので一覧に出さない', () => {
    const sites = sitesOf(blockedSite(YOUTUBE_DOMAIN), blockedSite('x.com'));
    expect(selectBlockList(sites).map((row) => row.domain)).toEqual(['x.com']);
  });
});

describe('selectYouTubeSection', () => {
  it('youtube.com が無ければすべて OFF', () => {
    expect(selectYouTubeSection({})).toEqual({
      enabled: false,
      blockAccess: false,
      hideShorts: false,
      hideRecommendations: false,
      hideComments: false,
      hideHomeFeed: false,
      timeLimit: null
    });
  });

  it('YouTube 機能とブロック設定を節の値にする', () => {
    const sites = sitesOf(
      blockedSite(
        YOUTUBE_DOMAIN,
        { timeLimit: LIMIT },
        { youtube: youtubeFeatures({ hideShorts: true, hideHomeFeed: true }) }
      )
    );
    expect(selectYouTubeSection(sites)).toEqual({
      enabled: true,
      blockAccess: true,
      hideShorts: true,
      hideRecommendations: false,
      hideComments: false,
      hideHomeFeed: true,
      timeLimit: LIMIT
    });
  });

  it('機能だけならアクセスブロックは OFF', () => {
    const sites = sitesOf(
      trackedSite(YOUTUBE_DOMAIN, { youtube: youtubeFeatures() })
    );
    expect(selectYouTubeSection(sites)).toMatchObject({
      enabled: true,
      blockAccess: false
    });
  });

  it('ブロックリストの入力から足した youtube.com（機能なし）も有効として見せる', () => {
    // 無効として見せると、非表示の切り替えでアクセスブロックが外れてしまう
    const sites = sitesOf(blockedSite(YOUTUBE_DOMAIN));
    expect(selectYouTubeSection(sites)).toMatchObject({
      enabled: true,
      blockAccess: true,
      hideShorts: false
    });
  });

  it('機能を使っていてブロック設定が無効なら、有効・アクセスブロック OFF で時間制限は保って見せる', () => {
    // ON に戻したときに保存済みの時間制限が復元されるよう、節の値にも残す
    const sites = sitesOf(
      blockedSite(
        YOUTUBE_DOMAIN,
        { enabled: false, timeLimit: LIMIT },
        { youtube: youtubeFeatures() }
      )
    );
    expect(selectYouTubeSection(sites)).toMatchObject({
      enabled: true,
      blockAccess: false,
      timeLimit: LIMIT
    });
  });

  it('無効のブロック設定だけの youtube.com は「有効」に数えない', () => {
    const sites = sitesOf(blockedSite(YOUTUBE_DOMAIN, { enabled: false }));
    expect(selectYouTubeSection(sites)).toMatchObject({
      enabled: false,
      blockAccess: false
    });
  });
});

describe('selectTrackedSiteRows', () => {
  it('ブロック状態・ブロック開始日・できる操作をサイトの設定から出す', () => {
    const sites = sitesOf(
      blockedSite('on.com', { addedAt: '2026-01-01T00:00:00.000Z' }),
      blockedSite('off.com', {
        enabled: false,
        addedAt: '2026-01-02T00:00:00.000Z'
      }),
      trackedSite('tracked.com'),
      trackedSite(YOUTUBE_DOMAIN, { youtube: youtubeFeatures() })
    );

    expect(selectTrackedSiteRows(sites)).toEqual([
      {
        domain: 'on.com',
        isBlocked: true,
        blockedAt: '2026-01-01T00:00:00.000Z',
        canReblock: false,
        canStopTracking: false
      },
      {
        domain: 'off.com',
        isBlocked: false,
        blockedAt: '2026-01-02T00:00:00.000Z',
        canReblock: false,
        canStopTracking: false
      },
      {
        domain: 'tracked.com',
        isBlocked: false,
        blockedAt: null,
        canReblock: true,
        canStopTracking: true
      },
      {
        domain: YOUTUBE_DOMAIN,
        isBlocked: false,
        blockedAt: null,
        canReblock: true,
        canStopTracking: false
      }
    ]);
  });
});
