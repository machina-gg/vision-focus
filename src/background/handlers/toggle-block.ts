import type { MessageHandler } from '~/lib/messaging';
import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { trackEvent } from '~/lib/analytics';
import { recordActivity } from '~/lib/activityService';
import { normalizeSiteKey } from '~/lib/siteKey';

export const toggleBlockHandler: MessageHandler<'toggle-block'> = async ({
  data
}) => {
  const { id, enabled } = data;

  // Validate input
  if (!id || typeof id !== 'string' || id.length === 0 || id.length > 100) {
    return { success: false, error: 'Invalid id' };
  }

  if (typeof enabled !== 'boolean') {
    return { success: false, error: 'Invalid enabled value' };
  }

  const settings = await getSettings();

  // Find the item to toggle
  const itemIndex = settings.blockList.findIndex((item) => item.id === id);

  if (itemIndex === -1) {
    return { success: false, error: 'Item not found' };
  }

  const item = settings.blockList[itemIndex];
  const domain = item.domain;

  // Update enabled state
  settings.blockList[itemIndex].enabled = enabled;

  await setSettings(settings);
  await updateBlockRules();

  // If re-enabling, block existing tabs that match
  if (enabled) {
    await blockExistingTabs();
  } else {
    // 解除を利用統計に送り、事実の表に 1 回として残す
    await trackUnblockEvent(domain);
    await recordActivity({
      kind: 'unblock',
      site: normalizeSiteKey(domain),
      at: new Date()
    });
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
