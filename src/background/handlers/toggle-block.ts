import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { trackEvent } from '~/lib/analytics';
import { recordActivity } from '~/lib/activityService';
import { setBlockEnabled } from '~/lib/siteService';
import { ToggleBlockBodySchema } from '~/types/messageSchemas';

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
