import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules, blockExistingTabs } from '~/background/blocker';
import { getSettings, setSettings } from '~/lib/storage';

export const togglePauseHandler: MessageHandler<'toggle-pause'> = async ({
  data
}) => {
  const { paused } = data;

  const settings = await getSettings();
  settings.paused = paused;
  await setSettings(settings);

  // Update block rules based on new paused state
  await updateBlockRules();

  // If unpausing, also block any existing tabs that match
  if (!paused) {
    await blockExistingTabs();
  }

  return {
    success: true,
    paused
  };
};
