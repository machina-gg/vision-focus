import type { MessageHandler } from '~/lib/messaging';
import { purgeSite } from '~/lib/activityService';
import { stopTracking } from '~/lib/siteService';
import { SiteBodySchema } from '~/types/messageSchemas';

/**
 * 追跡を止める。追跡中のサイトと、その事実（`activity` の列）を消す。
 * ブロック設定か YouTube 機能を持つサイトは止めない（ブロックや非表示が黙って外れるため）
 */
export const stopTrackingHandler: MessageHandler<'stop-tracking'> = async ({
  data
}) => {
  const parsed = SiteBodySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request body' };
  }
  const { domain } = parsed.data;

  const result = await stopTracking(domain);
  if (result === 'in-use') {
    return { success: false, error: 'Site is still blocked' };
  }
  // 追跡中に無くても事実の列が残っていることがあるので、消す処理は常に通す
  await purgeSite(domain);
  return { success: true };
};
