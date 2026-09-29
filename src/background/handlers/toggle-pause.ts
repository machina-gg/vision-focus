import type { MessageHandler } from '~/lib/messaging';
import { checkUnblockPassword, setPaused } from '~/lib/settingsService';
import { updateBlockRules, blockExistingTabs } from '~/background/blocker';
import { TogglePauseBodySchema } from '~/types/messageSchemas';
import { passwordError } from './passwordRejection';

/**
 * toggle-pause: ブロック全体の一時停止を切り替えてルールを更新する（再開したら開いているタブもブロックする。パスワード保護中に一時停止するときはパスワードを照合してから書く）
 * @param message data.paused に一時停止するか、data.password にパスワード保護中に照合するパスワード
 * @returns 成功と、切り替えた後の paused。失敗は invalid-request / password-required / password-mismatch / save-failed
 */
export const togglePauseHandler: MessageHandler<'toggle-pause'> = async ({
  data
}) => {
  const parsed = TogglePauseBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const { paused, password } = parsed.data;

  try {
    const rejection = await checkUnblockPassword(password, paused);
    if (rejection) return { success: false, error: passwordError(rejection) };

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
