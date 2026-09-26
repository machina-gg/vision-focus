import type { MessageHandler } from '~/lib/messaging';
import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { UpdateYouTubeSettingsBodySchema } from '~/types/messageSchemas';
import { appendActivity } from '~/lib/activityService';
import { YOUTUBE_DOMAIN } from '~/lib/youtubeBlockService';

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

    // アクセスブロックが効かなくなる操作を 1 回の解除として記録する
    // （機能全体の無効化でアクセスブロックが外れる場合も含む）。
    // ⚠ 保存より先に記録する。追跡中の集合は YouTube 機能が有効かどうかで youtube.com を
    // 含めるため、機能ごと無効にした設定を保存した後では youtube.com が集合から外れ、
    // 書き手に捨てられる
    if (wasBlockingAccess && !blocksAccess) {
      await recordYouTubeUnblock();
    }

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

/**
 * YouTube の解除を事実の表に記録する。
 * 設定の保存より先に呼ぶので、記録の失敗で保存そのものを止めないよう、ここで失敗を受け止める
 * （保存が本体で、記録は付随する事実。失敗はログに残して「記録できていない」と区別できるようにする）
 */
async function recordYouTubeUnblock(): Promise<void> {
  try {
    await appendActivity({
      kind: 'unblock',
      site: YOUTUBE_DOMAIN,
      at: new Date()
    });
  } catch (error) {
    console.error('Failed to record YouTube unblock activity', error);
  }
}
