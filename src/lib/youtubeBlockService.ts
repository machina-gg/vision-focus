/**
 * YouTubeBlockService - YouTube 固有の定数と記録
 *
 * YouTube のブロック判定（アクセスブロック・時間制限）は `blockService` が
 * youtube.com のサイトキーに組み立てて、他のサイトと同じ `evaluateBlock` に通す。
 * ここには判定を置かない（置くと判定が 2 箇所になる）。
 */

import { getAnalytics, setAnalytics } from '~/lib/storage';

/** YouTube のサイトキー。滞在時間・ブロック設定・時間制限の使用量はこのキーで引く */
export const YOUTUBE_DOMAIN = 'youtube.com';

/**
 * Increment YouTube block count in analytics
 */
export async function incrementYouTubeBlockCount(): Promise<void> {
  const analytics = await getAnalytics();
  const existing = analytics.siteBlockCounts[YOUTUBE_DOMAIN];

  analytics.siteBlockCounts[YOUTUBE_DOMAIN] = {
    domain: YOUTUBE_DOMAIN,
    count: (existing?.count ?? 0) + 1,
    lastBlocked: new Date().toISOString()
  };

  await setAnalytics(analytics);
}
