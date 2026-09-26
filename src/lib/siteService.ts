/**
 * SiteService - 追跡中のサイトの集合を返す
 *
 * 追跡中のサイトは分析の母集団で、事実の表（`activity`）に記録してよいサイトの集合でもある。
 * 集合は今の保存形から作る:
 * - 解除履歴（`unblockHistory.sites`）のキー
 * - ブロックリスト（`settings.blockList`）のドメイン
 * - YouTube 機能が有効なら youtube.com
 *
 * どれも `normalizeSiteKey` を通す。通さないと `*.example.com` と `example.com`、
 * `www.` の有無が別サイトになり、同じサイトの出来事が別の行に分かれる。
 */

import { getSettings, getUnblockHistory } from '~/lib/storage';
import { normalizeSiteKey } from '~/lib/siteKey';
import { YOUTUBE_DOMAIN } from '~/lib/youtubeBlockService';
import type { SiteKey } from '~/types/site';
import type { AppSettings, UnblockHistory } from '~/types/storage';

/**
 * 保存済みの設定と解除履歴から追跡中のサイトキーを作る（順序に意味は無い）。
 * 画面は `useStorageItem` で読んだ値をそのまま渡し、background と同じ集合を得る
 */
export function trackedSiteKeys(
  settings: Pick<AppSettings, 'blockList' | 'youtube'>,
  history: UnblockHistory
): SiteKey[] {
  const sources = [
    ...Object.keys(history.sites),
    ...settings.blockList.map((item) => item.domain),
    ...(settings.youtube.enabled ? [YOUTUBE_DOMAIN] : [])
  ];

  const keys = new Set<SiteKey>();
  for (const source of sources) {
    const key = normalizeSiteKey(source);
    // 空のキーはどのサイトも表さないので集合に入れない
    if (key) keys.add(key);
  }
  return [...keys];
}

/** 追跡中のサイトキーを重複なしで返す（順序に意味は無い） */
export async function getTrackedSiteKeys(): Promise<SiteKey[]> {
  const [history, settings] = await Promise.all([
    getUnblockHistory(),
    getSettings()
  ]);
  return trackedSiteKeys(settings, history);
}
