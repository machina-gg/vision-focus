import type { MessageHandler } from '~/lib/messaging';
import { updateBlockRules, blockExistingTabs } from '~/background/blocker';
import { getSettings, setSettings } from '~/lib/storage';

/**
 * toggle-pause: ブロック全体の一時停止を切り替えてルールを更新する（再開したら開いているタブもブロックする）
 * @param message data.paused に一時停止するか
 * @returns 成功と、切り替えた後の paused
 */
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
