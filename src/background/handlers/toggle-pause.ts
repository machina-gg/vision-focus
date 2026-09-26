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

  await updateBlockRules();

  if (!paused) {
    await blockExistingTabs();
  }

  return {
    success: true,
    paused
  };
};
