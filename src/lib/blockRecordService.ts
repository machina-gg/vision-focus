// blockExistingTabs は元ドメインの遷移イベントを起こさないため、ブロック成立時の記録は遷移リスナーではなくここに集める

import { setLastBlocked } from '~/lib/storage';
import { recordHostActivity } from '~/lib/activityService';
import type { BlockedReason } from '~/lib/blockRule';

/**
 * ブロックが成立したドメインを、ブロック画面の表示用（理由つき）と事実の表の両方に記録する。呼び出し側がブロック成立を確認してから呼ぶ（ここでは判定しない）
 * @param domain ブロックが成立したホスト名
 * @param reason ブロックの理由（ブロック画面の帯の文言を決める）
 */
export async function recordBlockedDomain(
  domain: string,
  reason: BlockedReason
): Promise<void> {
  await setLastBlocked({ domain, reason });

  await recordHostActivity([domain], (site) => ({
    kind: 'block',
    site,
    at: new Date()
  }));
}
