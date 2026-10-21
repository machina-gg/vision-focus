import { describe, expect, it } from 'vitest';

import { calculateBlockingDays } from '~/lib/blockingDays';
import { allowedSite, blockedSite, sitesOf, trackedSite } from '~/test/sites';

/** ローカルの暦で指定した時刻（月は 1 始まり） */
function at(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
): Date {
  return new Date(year, month - 1, day, hour, minute);
}

const NOW = at(2024, 6, 15, 12);

describe('calculateBlockingDays', () => {
  it('追跡中のサイトに無ければ null を返す', () => {
    expect(calculateBlockingDays('example.com', {}, NOW)).toBeNull();
  });

  it('ブロックの規則の無いサイト（規則なし・許可サイト）なら null を返す', () => {
    const sites = sitesOf(
      trackedSite('example.com'),
      blockedSite('youtube.com'),
      allowedSite('music.youtube.com')
    );
    expect(calculateBlockingDays('example.com', sites, NOW)).toBeNull();
    expect(calculateBlockingDays('music.youtube.com', sites, NOW)).toBeNull();
  });

  it('ブロックした日を 1 日目として、暦の日付の差 + 1 を返す', () => {
    const sites = sitesOf(
      blockedSite('example.com', { addedAt: at(2024, 6, 1, 9).toISOString() })
    );
    expect(calculateBlockingDays('example.com', sites, NOW)).toBe(15);
  });

  it('ブロックしたその日は 1 日目', () => {
    const sites = sitesOf(
      blockedSite('example.com', { addedAt: at(2024, 6, 15, 0).toISOString() })
    );
    expect(calculateBlockingDays('example.com', sites, NOW)).toBe(1);
  });

  it('23 時にブロックして翌朝見ると、24 時間経っていなくても 2 日目', () => {
    const sites = sitesOf(
      blockedSite('example.com', { addedAt: at(2024, 6, 14, 23).toISOString() })
    );
    expect(
      calculateBlockingDays('example.com', sites, at(2024, 6, 15, 9))
    ).toBe(2);
  });

  it('朝にブロックして翌日の同じ時刻前に見ても 2 日目', () => {
    const sites = sitesOf(
      blockedSite('example.com', { addedAt: at(2024, 6, 14, 9).toISOString() })
    );
    expect(
      calculateBlockingDays('example.com', sites, at(2024, 6, 15, 8))
    ).toBe(2);
  });

  it('同じ日の 23 時 59 分でも 1 日目のまま', () => {
    const sites = sitesOf(
      blockedSite('example.com', { addedAt: at(2024, 6, 15, 0).toISOString() })
    );
    expect(
      calculateBlockingDays('example.com', sites, at(2024, 6, 15, 23, 59))
    ).toBe(1);
  });

  it('登録日が未来でも 1 日目として扱う', () => {
    const sites = sitesOf(
      blockedSite('example.com', { addedAt: at(2024, 6, 20, 9).toISOString() })
    );
    expect(calculateBlockingDays('example.com', sites, NOW)).toBe(1);
  });

  it.each(['www.example.com', 'sub.example.com'])(
    'サブドメイン %s で遮られた場合はサイトの日数を返す',
    (host) => {
      const sites = sitesOf(
        blockedSite('example.com', {
          addedAt: at(2024, 6, 10, 9).toISOString()
        })
      );
      expect(calculateBlockingDays(host, sites, NOW)).toBe(6);
    }
  );
});
