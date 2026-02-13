import type { PlasmoMessaging } from '@plasmohq/messaging';

import {
  getSettings,
  setSettings,
  getAnalytics,
  setAnalytics
} from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { getTodayKey } from '~/lib/time';
import { trackEvent } from '~/lib/analytics';
import type { ToggleBlockRequest, ToggleBlockResponse } from '~/types/messages';
import type { DailyStat, SiteUnblockCount } from '~/types/storage';

export type { ToggleBlockRequest, ToggleBlockResponse };

const handler: PlasmoMessaging.MessageHandler<
  ToggleBlockRequest,
  ToggleBlockResponse
> = async (req, res) => {
  const { id, enabled } = req.body;

  // Validate input
  if (!id || typeof id !== 'string' || id.length === 0 || id.length > 100) {
    res.send({ success: false, error: 'Invalid id' });
    return;
  }

  if (typeof enabled !== 'boolean') {
    res.send({ success: false, error: 'Invalid enabled value' });
    return;
  }

  const settings = await getSettings();

  // Find the item to toggle
  const itemIndex = settings.blockList.findIndex((item) => item.id === id);

  if (itemIndex === -1) {
    res.send({ success: false, error: 'Item not found' });
    return;
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
    // If disabling (unblocking), record unblock count
    await incrementUnblockCount(domain);
  }

  res.send({ success: true });
};

// Increment unblock count for a domain
async function incrementUnblockCount(domain: string): Promise<void> {
  const analytics = await getAnalytics();
  const todayKey = getTodayKey();
  const now = new Date().toISOString();

  // Update site unblock count
  const existing = analytics.siteUnblockCounts[domain];
  const updatedUnblockCount: SiteUnblockCount = {
    domain,
    count: (existing?.count ?? 0) + 1,
    lastUnblocked: now
  };
  analytics.siteUnblockCounts[domain] = updatedUnblockCount;

  // Update daily stats
  const existingDailyStat = analytics.dailyStats[todayKey];
  const updatedDailyStat: DailyStat = {
    date: todayKey,
    wasteTime: existingDailyStat?.wasteTime || 0,
    investTime: existingDailyStat?.investTime || 0,
    blockCount: existingDailyStat?.blockCount || 0,
    unblockCount: (existingDailyStat?.unblockCount || 0) + 1
  };
  analytics.dailyStats[todayKey] = updatedDailyStat;

  await setAnalytics(analytics);

  // Send GA4 event if analytics opt-in is enabled
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

export default handler;
