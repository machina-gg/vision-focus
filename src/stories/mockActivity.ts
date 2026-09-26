// 日付は今日からの相対で作る（固定すると分析タブの期間から外れてすべて 0 になる）

import { toDateKey } from '~/lib/time';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import type { SiteKey } from '~/types/site';

export const STORY_SITES: SiteKey[] = [
  'twitter.com',
  'youtube.com',
  'reddit.com'
];

const STORY_DAYS = 45;

export function daysAgoKey(days: number, now: Date = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return toDateKey(date);
}

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
