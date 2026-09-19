import type { PlasmoMessaging } from '@plasmohq/messaging';

import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { UpdateYouTubeSettingsBodySchema } from '~/types/messageSchemas';

/**
 * YouTube 設定を保存するメッセージハンドラ。
 *
 * ブロックリストの操作（add-block / toggle-block）と同じく、保存と既存タブの
 * ブロックを background 側で完結させる。アクセスブロックが無効から有効に
 * 変わった場合だけ、開いている YouTube のタブをブロックする
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const parsed = UpdateYouTubeSettingsBodySchema.safeParse(req.body);

  if (!parsed.success) {
    res.send({ success: false, error: 'Invalid request body' });
    return;
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

    res.send({ success: true });
  } catch {
    res.send({ success: false, error: 'Failed to update YouTube settings' });
  }
};

export default handler;
