import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { trackEvent } from '~/lib/analytics';
import { recordActivity } from '~/lib/activityService';
import { setBlockEnabled } from '~/lib/siteService';
import { ToggleBlockBodySchema } from '~/types/messageSchemas';

/** ブロックリストのトグル（`block.enabled`）。domain はサイトキー */
export const toggleBlockHandler: MessageHandler<'toggle-block'> = async ({
  data
}) => {
  const parsed = ToggleBlockBodySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Invalid request body' };
  }
  const { domain, enabled } = parsed.data;

  const before = await setBlockEnabled(domain, enabled);
  if (!before) {
    return { success: false, error: 'Item not found' };
  }

  await updateBlockRules();

  // If re-enabling, block existing tabs that match
  if (enabled) {
    await blockExistingTabs();
  } else if (before.enabled) {
    // 解除を利用統計に送り、事実の表に 1 回として残す（効いていたブロックを外したときだけ）
    await trackUnblockEvent(domain);
    await recordActivity({ kind: 'unblock', site: domain, at: new Date() });
  }

  return { success: true };
};

// 利用統計（GA4。オプトイン時のみ送信）に解除を送る
async function trackUnblockEvent(domain: string): Promise<void> {
  await trackEvent('block_unblock', {
    domain_hashed: hashDomain(domain) // Send hashed domain to avoid leaking user data
  });
}

// Hash domain for privacy (SHA-256 would be better, but we use a simple hash here)
function hashDomain(domain: string): string {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    const char = domain.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
