import type { MessageHandler } from '~/lib/messaging';
import {
  getSettings,
  setSettings,
  getUnblockHistory,
  setUnblockHistory
} from '~/lib/storage';
import { updateBlockRules } from '../blocker';

export const removeBlockHandler: MessageHandler<'remove-block'> = async ({
  data
}) => {
  const { id } = data;

  // Validate input
  if (!id || typeof id !== 'string' || id.length === 0 || id.length > 100) {
    return { success: false };
  }

  const settings = await getSettings();

  // Find the item to be removed before filtering
  const removedItem = settings.blockList.find((item) => item.id === id);

  const originalLength = settings.blockList.length;
  settings.blockList = settings.blockList.filter((item) => item.id !== id);

  // Only update if something was actually removed
  if (settings.blockList.length < originalLength && removedItem) {
    await setSettings(settings);
    await updateBlockRules();

    const now = new Date().toISOString();

    // Update tracking history: change status to unblocked
    const history = await getUnblockHistory();
    if (history.sites[removedItem.domain]) {
      // Update existing entry
      history.sites[removedItem.domain].status = 'unblocked';
      history.sites[removedItem.domain].unblockedAt = now;
      // Keep blockedAt and reset time tracking
      history.sites[removedItem.domain].timeAfterUnblock = 0;
      history.sites[removedItem.domain].lastActivity = null;
    } else {
      // Create new entry (for sites blocked before this feature)
      history.sites[removedItem.domain] = {
        domain: removedItem.domain,
        status: 'unblocked',
        blockedAt: removedItem.createdAt, // Use original block date
        unblockedAt: now,
        timeAfterUnblock: 0,
        lastActivity: null
      };
    }
    await setUnblockHistory(history);
  }

  return { success: true };
};
