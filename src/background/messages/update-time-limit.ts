import type { PlasmoMessaging } from '@plasmohq/messaging';

import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules } from '../blocker';
import type { TimeLimit } from '~/types/storage';

// Message handler for updating time limit for a blocked site
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { id, timeLimit } = req.body as {
    id: string;
    timeLimit: TimeLimit | null;
  };

  if (!id || typeof id !== 'string') {
    res.send({ success: false, error: 'Invalid ID' });
    return;
  }

  try {
    const settings = await getSettings();
    const itemIndex = settings.blockList.findIndex((item) => item.id === id);

    if (itemIndex === -1) {
      res.send({ success: false, error: 'Block item not found' });
      return;
    }

    // Update the time limit
    settings.blockList[itemIndex].timeLimit = timeLimit;

    await setSettings(settings);

    // Update block rules (sites with time limits are handled differently)
    await updateBlockRules();

    res.send({ success: true });
  } catch {
    res.send({ success: false, error: 'Failed to update time limit' });
  }
};

export default handler;
