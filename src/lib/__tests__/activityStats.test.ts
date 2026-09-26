import { describe, expect, it } from 'vitest';

import {
  cumulativeSeries,
  dailySeries,
  daysBetween,
  lastActiveOn,
  lastBlockedOn,
  lastNDaysRange,
  lastUnblockedOn,
  monthRange,
  parseDateKey,
  rankSites,
  secondsOnDay,
  secondsSinceUnblock,
  siteTotals,
  sumRange,
  todaySummary,
  totalSecondsSinceUnblock,
  weekRange,
  weeksIn
} from '~/lib/activityStats';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';

function row(seconds: number, blocks = 0, unblocks = 0): DailySiteActivity {
  return { seconds, blocks, unblocks };
}

// 範囲の外の日と、母集団の外のサイト（untracked.com）を混ぜてある
const log: ActivityLog = {
  '2026-09-20': {
    'youtube.com': row(1000, 5, 0),
    'untracked.com': row(9999, 9, 9)
  },
  '2026-09-21': {
    'youtube.com': row(300, 2, 1),
    'reddit.com': row(600, 1, 0),
    'untracked.com': row(5000, 7, 7)
  },
  '2026-09-23': {
    'reddit.com': row(200, 4, 0),
    'x.com': row(50, 0, 2)
  },
  '2026-09-28': {
    'youtube.com': row(7777, 3, 0)
  }
};

const sites = ['youtube.com', 'reddit.com', 'x.com'];
const week = { from: '2026-09-21', to: '2026-09-27' };

describe('合計とランキングは同じ母集団・同じ期間から出る', () => {
  it('ランキングの値の和が期間合計と一致する（範囲外の日・母集団外のサイトはどちらにも入らない）', () => {
    const totals = sumRange(log, sites, week);
    const allSites = sites.length;
    for (const metric of ['seconds', 'blocks', 'unblocks'] as const) {
      const ranked = rankSites(log, sites, week, metric, allSites);
      const sum = ranked.reduce((acc, r) => acc + r.value, 0);
      expect(sum).toBe(totals[metric]);
    }
    expect(totals).toEqual({ seconds: 1150, blocks: 7, unblocks: 3 });
  });
});

describe('sumRange', () => {
  it('範囲は両端を含む', () => {
    expect(
      sumRange(log, sites, { from: '2026-09-20', to: '2026-09-21' })
    ).toEqual({ seconds: 1900, blocks: 8, unblocks: 1 });
  });

  it('母集団が空なら 0', () => {
    expect(sumRange(log, [], week)).toEqual({
      seconds: 0,
      blocks: 0,
      unblocks: 0
    });
  });

  it('from > to なら 0', () => {
    expect(
      sumRange(log, sites, { from: '2026-09-27', to: '2026-09-21' })
    ).toEqual({ seconds: 0, blocks: 0, unblocks: 0 });
  });
});

describe('rankSites', () => {
  it('多い順に並べ、limit 件で切る', () => {
    expect(rankSites(log, sites, week, 'seconds', 2)).toEqual([
      { domain: 'reddit.com', value: 800 },
      { domain: 'youtube.com', value: 300 }
    ]);
  });

  it('期間内に 0 のサイトは含めない', () => {
    expect(rankSites(log, sites, week, 'unblocks', 10)).toEqual([
      { domain: 'x.com', value: 2 },
      { domain: 'youtube.com', value: 1 }
    ]);
  });

  it('同値はドメインの昇順', () => {
    const tie: ActivityLog = {
      '2026-09-21': { 'b.com': row(10), 'a.com': row(10) }
    };
    expect(
      rankSites(tie, ['a.com', 'b.com'], week, 'seconds', 10).map(
        (r) => r.domain
      )
    ).toEqual(['a.com', 'b.com']);
  });

  it('limit が 0 以下なら空', () => {
    expect(rankSites(log, sites, week, 'seconds', 0)).toEqual([]);
  });
});

describe('dailySeries', () => {
  it('範囲内の全日を古い順に返し、事実の無い日は 0 で埋める', () => {
    const series = dailySeries(log, sites, {
      from: '2026-09-21',
      to: '2026-09-23'
    });
    expect(series).toEqual([
      { date: '2026-09-21', seconds: 900, blocks: 3, unblocks: 1 },
      { date: '2026-09-22', seconds: 0, blocks: 0, unblocks: 0 },
      { date: '2026-09-23', seconds: 250, blocks: 4, unblocks: 2 }
    ]);
  });

  it('月末をまたいでも日付が続く', () => {
    const dates = dailySeries({}, sites, {
      from: '2026-02-27',
      to: '2026-03-02'
    }).map((p) => p.date);
    expect(dates).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02'
    ]);
  });

  it('日別の和は期間合計と一致する', () => {
    const seconds = dailySeries(log, sites, week).reduce(
      (acc, p) => acc + p.seconds,
      0
    );
    expect(seconds).toBe(sumRange(log, sites, week).seconds);
  });
});

describe('cumulativeSeries', () => {
  it('範囲の初日からの累積秒', () => {
    expect(
      cumulativeSeries(log, sites, { from: '2026-09-20', to: '2026-09-23' })
    ).toEqual([
      { date: '2026-09-20', seconds: 1000 },
      { date: '2026-09-21', seconds: 1900 },
      { date: '2026-09-22', seconds: 1900 },
      { date: '2026-09-23', seconds: 2150 }
    ]);
  });
});

describe('siteTotals', () => {
  it('1 サイトの期間内の合計', () => {
    expect(siteTotals(log, 'youtube.com', week)).toEqual({
      seconds: 300,
      blocks: 2,
      unblocks: 1
    });
  });

  it('記録の無いサイトは 0', () => {
    expect(siteTotals(log, 'none.com', week)).toEqual({
      seconds: 0,
      blocks: 0,
      unblocks: 0
    });
  });
});

describe('secondsOnDay', () => {
  it('その日の秒数', () => {
    expect(secondsOnDay(log, 'reddit.com', '2026-09-23')).toBe(200);
  });

  it('日もサイトも無ければ 0', () => {
    expect(secondsOnDay(log, 'reddit.com', '2026-09-22')).toBe(0);
    expect(secondsOnDay(log, 'none.com', '2026-09-23')).toBe(0);
  });
});

describe('lastUnblockedOn / lastActiveOn', () => {
  it('最後に解除した日', () => {
    expect(lastUnblockedOn(log, 'youtube.com')).toBe('2026-09-21');
    expect(lastUnblockedOn(log, 'x.com')).toBe('2026-09-23');
  });

  it('解除したことが無ければ null', () => {
    expect(lastUnblockedOn(log, 'reddit.com')).toBeNull();
  });

  it('最後に表示されていた日', () => {
    expect(lastActiveOn(log, 'youtube.com')).toBe('2026-09-28');
    expect(lastActiveOn(log, 'reddit.com')).toBe('2026-09-23');
  });

  it('表示されたことが無ければ null', () => {
    const onlyBlocks: ActivityLog = { '2026-09-21': { 'a.com': row(0, 3) } };
    expect(lastActiveOn(onlyBlocks, 'a.com')).toBeNull();
  });
});

describe('secondsSinceUnblock', () => {
  it('最後に解除した日（その日を含む）から today までの秒数', () => {
    expect(secondsSinceUnblock(log, 'youtube.com', '2026-09-28')).toBe(
      300 + 7777
    );
  });

  it('解除したことが無ければ 0', () => {
    expect(secondsSinceUnblock(log, 'reddit.com', '2026-09-28')).toBe(0);
  });
});

describe('todaySummary', () => {
  it('今日の合計と、今日いちばんブロックされたサイト', () => {
    expect(todaySummary(log, sites, '2026-09-21')).toEqual({
      seconds: 900,
      blocks: 3,
      unblocks: 1,
      topBlockedSite: 'youtube.com'
    });
  });

  it('今日ブロックが無ければ topBlockedSite は null', () => {
    expect(todaySummary(log, sites, '2026-09-22')).toEqual({
      seconds: 0,
      blocks: 0,
      unblocks: 0,
      topBlockedSite: null
    });
  });

  it('母集団外のサイトは topBlockedSite にならない', () => {
    expect(todaySummary(log, ['x.com'], '2026-09-20').topBlockedSite).toBe(
      null
    );
  });
});

describe('weekRange', () => {
  it('月曜〜日曜', () => {
    // 2026-09-23 は水曜
    expect(weekRange(new Date(2026, 8, 23, 10), 0)).toEqual(week);
  });

  it('月曜 0 時はその週の初日', () => {
    expect(weekRange(new Date(2026, 8, 21, 0, 0), 0)).toEqual(week);
  });

  it('日曜は前の月曜から始まる週', () => {
    expect(weekRange(new Date(2026, 8, 27, 23, 59), 0)).toEqual(week);
  });

  it('offset -1 は先週', () => {
    expect(weekRange(new Date(2026, 8, 23, 10), -1)).toEqual({
      from: '2026-09-14',
      to: '2026-09-20'
    });
  });
});

describe('monthRange', () => {
  it('1 日〜末日', () => {
    expect(monthRange(new Date(2026, 8, 15, 10), 0)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30'
    });
  });

  it('1 日 0 時はその月', () => {
    expect(monthRange(new Date(2026, 8, 1, 0, 0), 0)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30'
    });
  });

  it('offset -1 は先月。年をまたぐ', () => {
    expect(monthRange(new Date(2026, 0, 10, 10), -1)).toEqual({
      from: '2025-12-01',
      to: '2025-12-31'
    });
  });

  it('月末の日から offset しても月が飛ばない', () => {
    expect(monthRange(new Date(2026, 2, 31, 10), -1)).toEqual({
      from: '2026-02-01',
      to: '2026-02-28'
    });
  });
});

describe('lastNDaysRange', () => {
  it('今日を含む直近 n 日', () => {
    expect(lastNDaysRange(new Date(2026, 8, 23, 10), 7)).toEqual({
      from: '2026-09-17',
      to: '2026-09-23'
    });
  });

  it('n = 1 は今日だけ', () => {
    expect(lastNDaysRange(new Date(2026, 8, 23, 10), 1)).toEqual({
      from: '2026-09-23',
      to: '2026-09-23'
    });
  });

  it('n が 1 未満なら空の範囲', () => {
    const range = lastNDaysRange(new Date(2026, 8, 23, 10), 0);
    expect(dailySeries(log, sites, range)).toEqual([]);
  });
});

describe('lastBlockedOn', () => {
  it('ブロックが 1 回以上あった最後の日', () => {
    expect(lastBlockedOn(log, 'youtube.com')).toBe('2026-09-28');
    expect(lastBlockedOn(log, 'reddit.com')).toBe('2026-09-23');
  });

  it('ブロックされたことが無ければ null', () => {
    expect(lastBlockedOn(log, 'x.com')).toBeNull();
  });
});

describe('totalSecondsSinceUnblock', () => {
  it('各サイトの secondsSinceUnblock の和', () => {
    const today = '2026-09-28';
    const expected =
      secondsSinceUnblock(log, 'youtube.com', today) +
      secondsSinceUnblock(log, 'x.com', today);
    expect(totalSecondsSinceUnblock(log, ['youtube.com', 'x.com'], today)).toBe(
      expected
    );
    // youtube.com は 09-21 から（300 + 7777）、x.com は 09-23 から（50）
    expect(expected).toBe(300 + 7777 + 50);
  });

  it('サイトが空なら 0', () => {
    expect(totalSecondsSinceUnblock(log, [], '2026-09-28')).toBe(0);
  });
});

describe('weeksIn', () => {
  it('範囲と重なる月曜〜日曜の週を、範囲の内側に切り詰めて古い順に返す', () => {
    // 2026-09-01 は火曜、2026-09-30 は水曜
    expect(weeksIn({ from: '2026-09-01', to: '2026-09-30' })).toEqual([
      { from: '2026-09-01', to: '2026-09-06' },
      { from: '2026-09-07', to: '2026-09-13' },
      { from: '2026-09-14', to: '2026-09-20' },
      { from: '2026-09-21', to: '2026-09-27' },
      { from: '2026-09-28', to: '2026-09-30' }
    ]);
  });

  it('週ちょうどの範囲は 1 週', () => {
    expect(weeksIn(week)).toEqual([week]);
  });

  it('from > to なら空', () => {
    expect(weeksIn({ from: '2026-09-27', to: '2026-09-21' })).toEqual([]);
  });
});

describe('daysBetween / parseDateKey', () => {
  it('日付キーをローカルの年月日として読む', () => {
    const d = parseDateKey('2026-03-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 1]);
  });

  it('日数の差（同じ日は 0、月・年をまたいでも暦の日数）', () => {
    expect(daysBetween('2026-09-21', '2026-09-21')).toBe(0);
    expect(daysBetween('2026-09-21', '2026-09-28')).toBe(7);
    expect(daysBetween('2026-02-27', '2026-03-01')).toBe(2);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-09-28', '2026-09-21')).toBe(-7);
  });

  it('夏時間の切り替えをまたいでも暦の日数', () => {
    // 米国は 2026-03-08、欧州は 2026-03-29 に切り替わる
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });
});
