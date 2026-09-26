/**
 * Storybook 用の事実の表（activity）。
 * 分析タブは今日を基準に「今週・今月・直近 14 日」を切り出すので、日付を固定すると
 * 期間から外れてすべて 0 になる。日付は必ず今日からの相対で作る
 */

import { toDateKey } from '~/lib/time';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import type { SiteKey } from '~/types/site';

/** 例に使う追跡中のサイト */
export const STORY_SITES: SiteKey[] = [
  'twitter.com',
  'youtube.com',
  'reddit.com'
];

/** 例のデータを置く日数（今週・先週・今月・先月に値が入る長さ） */
const STORY_DAYS = 45;

/** 今日から days 日前のローカル日付 */
export function daysAgoKey(days: number, now: Date = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return toDateKey(date);
}

/** [サイト, 事実の一部, 何日前か] から事実の表を作る */
export function mockActivity(
  entries: [SiteKey, Partial<DailySiteActivity>, number][],
  now: Date = new Date()
): ActivityLog {
  const log: ActivityLog = {};
  for (const [site, values, daysAgo] of entries) {
    const key = daysAgoKey(daysAgo, now);
    log[key] = {
      ...log[key],
      [site]: { seconds: 0, blocks: 0, unblocks: 0, ...values }
    };
  }
  return log;
}

/** STORY_SITES の直近 STORY_DAYS 日ぶんの例（日ごとに値が揺れる決まった数列） */
export function storyActivity(now: Date = new Date()): ActivityLog {
  const entries: [SiteKey, Partial<DailySiteActivity>, number][] = [];
  for (let d = 0; d < STORY_DAYS; d++) {
    entries.push(
      [
        'twitter.com',
        {
          seconds: 600 + ((d * 137) % 1800),
          blocks: (d * 3) % 5,
          unblocks: d % 9 === 0 ? 1 : 0
        },
        d
      ],
      [
        'youtube.com',
        {
          seconds: 1200 + ((d * 211) % 2400),
          blocks: (d * 7) % 6,
          unblocks: d % 11 === 2 ? 1 : 0
        },
        d
      ],
      ['reddit.com', { seconds: (d % 3) * 400, blocks: d % 4 }, d]
    );
  }
  return mockActivity(entries, now);
}
