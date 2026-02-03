import type { PlasmoMessaging } from '@plasmohq/messaging';

import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import type { ToggleBlockRequest, ToggleBlockResponse } from '~/types/messages';

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

  // Update enabled state
  settings.blockList[itemIndex].enabled = enabled;

  await setSettings(settings);
  await updateBlockRules();

  // If re-enabling, block existing tabs that match
  if (enabled) {
    await blockExistingTabs();
  }

  res.send({ success: true });
};

export default handler;
