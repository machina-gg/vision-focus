import type { PlasmoMessaging } from '@plasmohq/messaging';

import { parseDomainInput, isValidDomain, generateId } from '~/lib/domain';
import {
  getSettings,
  setSettings,
  getUnblockHistory,
  setUnblockHistory,
  getAnalytics,
  setAnalytics
} from '~/lib/storage';
import { canAddToBlocklist } from '~/lib/license';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import type { AddBlockRequest, AddBlockResponse } from '~/types/messages';

export type { AddBlockRequest, AddBlockResponse };

const handler: PlasmoMessaging.MessageHandler<
  AddBlockRequest,
  AddBlockResponse
> = async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    res.send({ success: false, error: 'Domain is required' });
    return;
  }

  const settings = await getSettings();

  // Check tier limit using license service
  const limitCheck = await canAddToBlocklist(settings.blockList.length);
  if (!limitCheck.allowed) {
    res.send({
      success: false,
      error: limitCheck.reason || `Limit reached (${limitCheck.limit} sites)`,
      limitReached: true
    });
    return;
  }

  const { domain: parsedDomain, isWildcard } = parseDomainInput(domain);

  // Validate domain format
  if (!isValidDomain(parsedDomain)) {
    res.send({ success: false, error: 'Invalid domain format' });
    return;
  }

  // Check if already in list
  const exists = settings.blockList.some(
    (item) => item.domain.toLowerCase() === parsedDomain.toLowerCase()
  );
  if (exists) {
    res.send({ success: false, error: 'Domain already in block list' });
    return;
  }

  const now = new Date().toISOString();

  // Add to block list
  settings.blockList.push({
    id: generateId(),
    domain: parsedDomain,
    isWildcard,
    createdAt: now,
    enabled: true
  });

  await setSettings(settings);
  await updateBlockRules();
  await blockExistingTabs();

  // Add or update tracking history
  const history = await getUnblockHistory();

  if (history.sites[parsedDomain]) {
    // Re-blocking: update status back to blocked, reset time
    history.sites[parsedDomain].status = 'blocked';
    history.sites[parsedDomain].blockedAt = now;
    history.sites[parsedDomain].unblockedAt = null;
    history.sites[parsedDomain].timeAfterUnblock = 0;
    history.sites[parsedDomain].lastActivity = null;
  } else {
    // New block: create tracking entry
    history.sites[parsedDomain] = {
      domain: parsedDomain,
      status: 'blocked',
      blockedAt: now,
      unblockedAt: null,
      timeAfterUnblock: 0,
      lastActivity: null
    };
  }
  await setUnblockHistory(history);

  // Initialize analytics tracking for this domain as 'waste' category
  const analytics = await getAnalytics();
  if (!analytics.siteTime[parsedDomain]) {
    analytics.siteTime[parsedDomain] = {
      domain: parsedDomain,
      time: 0,
      category: 'waste',
      lastUpdated: now
    };
  } else {
    analytics.siteTime[parsedDomain].category = 'waste';
  }
  analytics.siteCategories[parsedDomain] = 'waste';
  await setAnalytics(analytics);

  res.send({ success: true });
};

export default handler;
