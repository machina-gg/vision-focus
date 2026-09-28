import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules } from '../blocker';
import { recordActivity } from '~/lib/activityService';
import { checkUnblockPassword } from '~/lib/settingsService';
import { removeBlock } from '~/lib/siteService';
import { RemoveBlockBodySchema } from '~/types/messageSchemas';
import { passwordError } from './passwordRejection';

/**
 * remove-block: ドメインをブロック対象から外してルールを更新する（有効だったブロックなら解除として記録する。パスワード保護中はパスワードを照合してから書く）
 * @param message data.domain に外すドメイン、data.password にパスワード保護中に照合するパスワード
 * @returns 成功か、失敗の種類（invalid-request / password-required / password-mismatch）。ブロック対象に無いドメインは成功として扱う
 */
export const removeBlockHandler: MessageHandler<'remove-block'> = async ({
  data
}) => {
  const parsed = RemoveBlockBodySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }
  const { domain, password } = parsed.data;

  const rejection = await checkUnblockPassword(password, true);
  if (rejection) return { success: false, error: passwordError(rejection) };

  const removed = await removeBlock(domain);
  if (!removed) {
    return { success: true };
  }

  await updateBlockRules();

  // 無効化済みの項目の削除まで数えると、トグル OFF の解除と二重に数えてしまう
  if (removed.enabled) {
    await recordActivity({ kind: 'unblock', site: domain, at: new Date() });
  }

  return { success: true };
};
