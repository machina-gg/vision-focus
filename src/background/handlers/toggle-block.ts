import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { trackEvent } from '~/lib/analytics';
import { recordActivity } from '~/lib/activityService';
import { checkUnblockPassword } from '~/lib/settingsService';
import { setBlockEnabled } from '~/lib/siteService';
import { ToggleBlockBodySchema } from '~/types/messageSchemas';
import { passwordError } from './passwordRejection';

/**
 * toggle-block: ドメインのブロックを有効・無効にしてルールを更新する（有効にしたら開いているタブもブロックし、有効から無効にしたら解除として記録する。パスワード保護中に無効にするときはパスワードを照合してから書く）
 * @param message data.domain に対象のドメイン、data.enabled にブロックを有効にするか、data.password にパスワード保護中に照合するパスワード
 * @returns 成功か、失敗の種類（invalid-request / password-required / password-mismatch / block-not-found）
 */
export const toggleBlockHandler: MessageHandler<'toggle-block'> = async ({
  data
}) => {
  const parsed = ToggleBlockBodySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }
  const { domain, enabled, password } = parsed.data;

  const rejection = await checkUnblockPassword(password, !enabled);
  if (rejection) return { success: false, error: passwordError(rejection) };

  const before = await setBlockEnabled(domain, enabled);
  if (!before) {
    return { success: false, error: { code: 'block-not-found' } };
  }

  await updateBlockRules();

  if (enabled) {
    await blockExistingTabs();
  } else if (before.enabled) {
    await trackUnblockEvent(domain);
    await recordActivity({ kind: 'unblock', site: domain, at: new Date() });
  }

  return { success: true };
};

async function trackUnblockEvent(domain: string): Promise<void> {
  await trackEvent('block_unblock', {
    domain_hashed: hashDomain(domain)
  });
}

function hashDomain(domain: string): string {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    const char = domain.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
