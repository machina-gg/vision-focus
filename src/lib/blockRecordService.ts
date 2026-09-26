// blockExistingTabs は元ドメインの遷移イベントを起こさないため、ブロック成立時の記録は遷移リスナーではなくここに集める

import { setLastBlockedDomain } from '~/lib/storage';
import { recordHostActivity } from '~/lib/activityService';

// 呼び出し側がブロック成立を確認してから呼ぶ（ここでは判定しない）
export async function recordBlockedDomain(domain: string): Promise<void> {
  await setLastBlockedDomain(domain);

  await recordHostActivity([domain], (site) => ({
    kind: 'block',
    site,
    at: new Date()
  }));
}
