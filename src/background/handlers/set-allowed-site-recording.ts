import type { MessageHandler } from '~/lib/messaging';
import { setAllowedSiteRecording } from '~/lib/siteService';
import { SetAllowedSiteRecordingBodySchema } from '~/types/messageSchemas';

/**
 * set-allowed-site-recording: 許可サイトの「記録する」を切り替える（判定にも転送ルールにも関わらないのでルールは作り直さない。過去の記録は消さない）
 * @param message data.domain に許可サイトのサイトキー、data.recordTime に記録するか
 * @returns 成功か、失敗の種類（invalid-request / allow-not-found）
 */
export const setAllowedSiteRecordingHandler: MessageHandler<
  'set-allowed-site-recording'
> = async ({ data }) => {
  const parsed = SetAllowedSiteRecordingBodySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }
  const { domain, recordTime } = parsed.data;

  const changed = await setAllowedSiteRecording(domain, recordTime);
  if (!changed) {
    return { success: false, error: { code: 'allow-not-found' } };
  }
  return { success: true };
};
