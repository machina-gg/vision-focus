import type { MessageHandler } from '~/lib/messaging';
import { getSettings, setSettings } from '~/lib/storage';
import { getActiveBlockedDomains } from '~/lib/blockService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { ImportSettingsBodySchema } from '~/types/messageSchemas';

/**
 * インポートした設定を保存するメッセージハンドラ。
 *
 * ブロックリストの操作（add-block / toggle-block）や YouTube 設定
 * （update-youtube-settings）と同じく、保存と既存タブのブロックを background 側で
 * 完結させる。インポートだけがストレージへ直接書いていたため、開いているタブが
 * 置き換わらなかった（#396）
 *
 * 受け取るのは画面側が applyImportedSettings で組み立てた適用後の設定。
 * マージ規則と警告表示は画面側に残す。スタイル（vision）はブロック判定に
 * 関わらないため、ここでは扱わない
 */
export const importSettingsHandler: MessageHandler<'import-settings'> = async ({
  data
}) => {
  const parsed = ImportSettingsBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Invalid request body' };
  }

  try {
    const current = await getSettings();

    // 保存前のブロック対象を控える（保存後は新旧の区別が付かなくなる）
    const blockedBefore = await getActiveBlockedDomains();

    await setSettings({ ...current, ...parsed.data.settings });

    // declarativeNetRequest のルールを設定に追従させる
    await updateBlockRules();

    // ⚠ ブロックリストの件数ではなく、実際にブロック対象になるドメインの集合で
    //    比較する（項目の有効化・時間制限の解除・一時停止の解除・YouTube の
    //    アクセスブロックのいずれでも対象は増えるため）
    const blockedAfter = await getActiveBlockedDomains();
    const hasNewlyBlocked = blockedAfter.some(
      (domain) => !blockedBefore.includes(domain)
    );

    // ルール更新は新規の遷移にしか効かないため、開いているタブは明示的にブロックする
    if (hasNewlyBlocked) {
      await blockExistingTabs();
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to import settings' };
  }
};
