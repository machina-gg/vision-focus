import type { MessageHandler } from '~/lib/messaging';
import { setTimeLimit } from '~/lib/siteService';
import { updateBlockRules } from '../blocker';
import { UpdateTimeLimitBodySchema } from '~/types/messageSchemas';

/**
 * update-time-limit: ブロック対象のドメインの時間制限を設定し直してルールを更新する
 * @param message data.domain に対象のドメイン、data.timeLimit に新しい時間制限（null で外す）
 * @returns 成功か、失敗の種類（invalid-request / block-not-found / save-failed）
 */
export const updateTimeLimitHandler: MessageHandler<
  'update-time-limit'
> = async ({ data }) => {
  const parsed = UpdateTimeLimitBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const { domain, timeLimit } = parsed.data;

  try {
    const updated = await setTimeLimit(domain, timeLimit);
    if (!updated) {
      return { success: false, error: { code: 'block-not-found' } };
    }

    await updateBlockRules();

    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
