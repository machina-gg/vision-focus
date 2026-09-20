import type { MessageHandler } from '~/lib/messaging';
import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules } from '../blocker';
import { UpdateTimeLimitBodySchema } from '~/types/messageSchemas';

// Message handler for updating time limit for a blocked site
export const updateTimeLimitHandler: MessageHandler<
  'update-time-limit'
> = async ({ data }) => {
  const parsed = UpdateTimeLimitBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Invalid request body' };
  }

  const { id, timeLimit } = parsed.data;

  try {
    const settings = await getSettings();
    const itemIndex = settings.blockList.findIndex((item) => item.id === id);

    if (itemIndex === -1) {
      return { success: false, error: 'Block item not found' };
    }

    // Update the time limit
    settings.blockList[itemIndex].timeLimit = timeLimit;

    await setSettings(settings);

    // Update block rules (sites with time limits are handled differently)
    await updateBlockRules();

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update time limit' };
  }
};
