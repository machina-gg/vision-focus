import type { MessageHandler } from '~/lib/messaging';
import { parseDomainInput, isValidDomain, generateId } from '~/lib/domain';
import {
  getSettings,
  setSettings,
  getUnblockHistory,
  setUnblockHistory
} from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../blocker';

export const addBlockHandler: MessageHandler<'add-block'> = async ({
  data
}) => {
  const { domain } = data;

  if (!domain) {
    return { success: false, error: 'Domain is required' };
  }

  const settings = await getSettings();

  const { domain: parsedDomain, isWildcard } = parseDomainInput(domain);

  // Validate domain format
  if (!isValidDomain(parsedDomain)) {
    return { success: false, error: 'Invalid domain format' };
  }

  // Check if already in list
  const exists = settings.blockList.some(
    (item) => item.domain.toLowerCase() === parsedDomain.toLowerCase()
  );
  if (exists) {
    return { success: false, error: 'Domain already in block list' };
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

  return { success: true };
};
