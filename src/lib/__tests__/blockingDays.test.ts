import { describe, expect, it } from 'vitest';

import { calculateBlockingDays } from '~/lib/blockingDays';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';

const NOW = new Date('2024-06-15T00:00:00Z');

describe('calculateBlockingDays', () => {
  it('追跡中のサイトに無ければ null を返す', () => {
    expect(calculateBlockingDays('example.com', {}, NOW)).toBeNull();
  });

  it('ブロック設定の無いサイトなら null を返す', () => {
    const sites = sitesOf(trackedSite('example.com'));
    expect(calculateBlockingDays('example.com', sites, NOW)).toBeNull();
  });

  it('サイトのブロックリストに入れた日からの経過日数を返す', () => {
    const sites = sitesOf(
      blockedSite('example.com', { addedAt: '2024-06-01T00:00:00Z' })
    );
    expect(calculateBlockingDays('example.com', sites, NOW)).toBe(14);
  });

  it('登録当日は最小値の 1 を返す', () => {
    const sites = sitesOf(
      blockedSite('example.com', { addedAt: '2024-06-15T00:00:00Z' })
    );
    expect(calculateBlockingDays('example.com', sites, NOW)).toBe(1);
  });

  it.each(['www.example.com', 'sub.example.com'])(
    'サブドメイン %s で遮られた場合はサイトの日数を返す',
    (host) => {
      const sites = sitesOf(
        blockedSite('example.com', { addedAt: '2024-06-10T00:00:00Z' })
      );
      expect(calculateBlockingDays(host, sites, NOW)).toBe(5);
    }
  );

  it('端数の時間は切り捨てる', () => {
    const sites = sitesOf(
      blockedSite('example.com', { addedAt: '2024-06-12T01:00:00Z' })
    );
    // 2 日と 23 時間経過 → 3 に繰り上げず 2 に切り捨てる
    expect(calculateBlockingDays('example.com', sites, NOW)).toBe(2);
  });
});
