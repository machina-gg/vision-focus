// blockExistingTabs は元ドメインの遷移イベントを起こさないため、ブロック成立時の記録は遷移リスナーではなくここに集める

import { setLastBlockedDomain } from '~/lib/storage';
import { recordHostActivity } from '~/lib/activityService';

/**
 * ブロックが成立したドメインを、ブロック画面の表示用と事実の表の両方に記録する。呼び出し側がブロック成立を確認してから呼ぶ（ここでは判定しない）
 * @param domain ブロックが成立したホスト名
 */
export async function recordBlockedDomain(domain: string): Promise<void> {
  await setLastBlockedDomain(domain);

  await recordHostActivity([domain], (site) => ({
    kind: 'block',
    site,
    at: new Date()
  }));
}
