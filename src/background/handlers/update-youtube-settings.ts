import type { MessageHandler } from '~/lib/messaging';
import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { UpdateYouTubeSettingsBodySchema } from '~/types/messageSchemas';

/**
 * YouTube 設定を保存するメッセージハンドラ。
 *
 * ブロックリストの操作（add-block / toggle-block）と同じく、保存と既存タブの
 * ブロックを background 側で完結させる。アクセスブロックが無効から有効に
 * 変わった場合だけ、開いている YouTube のタブをブロックする。
 *
 * どのタブを実際に置き換えるかは blockService が決める。時間制限を設定している
 * 場合は超過するまでブロックされないため、ここで blockExistingTabs() を呼んでも
 * タブは置き換わらない（#392）
 */
export const updateYouTubeSettingsHandler: MessageHandler<
  'update-youtube-settings'
> = async ({ data }) => {
  const parsed = UpdateYouTubeSettingsBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Invalid request body' };
  }

  const { youtube } = parsed.data;

  try {
    const settings = await getSettings();

    // 保存前の設定で判定する（保存後は新旧の区別が付かなくなる）
    const wasBlockingAccess = Boolean(
      settings.youtube?.enabled && settings.youtube?.blockAccess
    );
    const blocksAccess = youtube.enabled && youtube.blockAccess;

    await setSettings({ ...settings, youtube });

    // declarativeNetRequest のルールを設定に追従させる
    await updateBlockRules();

    // ルール更新は新規の遷移にしか効かないため、開いているタブは明示的にブロックする
    if (!wasBlockingAccess && blocksAccess) {
      await blockExistingTabs();
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update YouTube settings' };
  }
};
