import type { MessageHandler } from '~/lib/messaging';
import { purgeSite } from '~/lib/activityService';
import { stopTracking } from '~/lib/siteService';
import { SiteBodySchema } from '~/types/messageSchemas';

/**
 * stop-tracking: ドメインの追跡をやめ、そのサイトの記録を消す（ブロック設定か YouTube 機能が残るサイトはやめない）
 * @param message data.domain に追跡をやめるドメイン
 * @returns 成功か、失敗の種類（invalid-request / site-in-use）
 */
export const stopTrackingHandler: MessageHandler<'stop-tracking'> = async ({
  data
}) => {
  const parsed = SiteBodySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }
  const { domain } = parsed.data;

  const result = await stopTracking(domain);
  if (result === 'in-use') {
    return { success: false, error: { code: 'site-in-use' } };
  }
  // 追跡中に無くても事実の列が残っていることがあるので、消す処理は常に通す
  await purgeSite(domain);
  return { success: true };
};
