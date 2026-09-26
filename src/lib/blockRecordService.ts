/**
 * BlockRecordService - ブロック成立時の記録を一元化する
 *
 * ブロックが成立したときに残す記録は 4 つある。
 * 1. サイト別のブロック回数（`analytics.siteBlockCounts`）
 * 2. 最後にブロックしたドメイン（session。ブロック画面の帯の表示に使う）
 * 3. 当日のブロック回数（`analytics.dailyStats`）
 * 4. 事実の表（`activity`）の `block`（追跡中のサイトに属するときだけ）
 *
 * 記録が始まる経路は 2 つあり、どちらも同じ 4 つを残す必要がある。
 * - `webNavigation.onBeforeNavigate`（declarativeNetRequest のリダイレクト経路）
 * - `blockExistingTabs`（設定変更で既に開いているタブを飛ばす経路）
 *
 * 後者は元ドメインの遷移イベントを起こさないため、記録を前者のリスナー内に
 * 書いたままだと記録されず、ブロック画面に帯が出ない（machina-gg/vision-focus#351）。
 */

import {
  getAnalytics,
  setAnalytics,
  incrementSiteBlockCount,
  setLastBlockedDomain
} from '~/lib/storage';
import { getTodayKey } from '~/lib/time';
import { recordHostActivity } from '~/lib/activityService';

/**
 * ブロックが成立したドメインを記録する
 *
 * ⚠ 呼び出し側がブロック成立を確認してから呼ぶこと。
 * 本関数はブロックすべきかどうかを判定しない（判定は `blockService` の
 * `getBlockStateForDomain()` が一手に持つ）
 */
export async function recordBlockedDomain(domain: string): Promise<void> {
  // サイト別のブロック回数
  await incrementSiteBlockCount(domain);

  // ブロック画面が読み出す「最後にブロックしたドメイン」
  await setLastBlockedDomain(domain);

  // 当日のブロック回数
  const analytics = await getAnalytics();
  const today = getTodayKey();
  const todayStats = analytics.dailyStats[today] || {
    date: today,
    wasteTime: 0,
    investTime: 0,
    blockCount: 0,
    unblockCount: 0
  };

  await setAnalytics({
    ...analytics,
    dailyStats: {
      ...analytics.dailyStats,
      [today]: {
        ...todayStats,
        blockCount: todayStats.blockCount + 1
      }
    }
  });

  // 事実の表のブロック回数。ホスト名（www. / m. 付きなど）は追跡中のサイトに引き直される。
  // 記録の失敗はここで止まらないので、呼び出し元のリダイレクトは続く
  await recordHostActivity([domain], (site) => ({
    kind: 'block',
    site,
    at: new Date()
  }));
}
