import type { MessageHandler } from '~/lib/messaging';
import { setPaused } from '~/lib/settingsService';
import { updateBlockRules, blockExistingTabs } from '~/background/blocker';
import { TogglePauseBodySchema } from '~/types/messageSchemas';

/**
 * toggle-pause: ブロック全体の一時停止を切り替えてルールを更新する（再開したら開いているタブもブロックする）
 * @param message data.paused に一時停止するか
 * @returns 成功と、切り替えた後の paused。失敗は invalid-request / save-failed
 */
export const togglePauseHandler: MessageHandler<'toggle-pause'> = async ({
  data
}) => {
  const parsed = TogglePauseBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const { paused } = parsed.data;

  try {
    await setPaused(paused);

    await updateBlockRules();

    if (!paused) {
      await blockExistingTabs();
    }
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }

  return {
    success: true,
    paused
  };
};
