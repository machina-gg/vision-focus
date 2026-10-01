import type { MessageHandler } from '~/lib/messaging';
import { purgeSite } from '~/lib/activityService';
import { toImportedSites } from '~/lib/settingsExport';
import { checkUnblockPassword, importSettings } from '~/lib/settingsService';
import { replaceSites } from '~/lib/siteService';
import { getRedirectedHosts } from '../blocker';
import { updateBlockRulesAndBlockNewTargets } from '../blockNewTargets';
import { ImportSettingsBodySchema } from '~/types/messageSchemas';
import { passwordError } from './passwordRejection';

// 保存は background で完結させる（画面から保存すると開いているタブが置き換わらない）
/**
 * import-settings: 設定ファイルの設定・表示設定・画像とサイトで保存済みの値を丸ごと置き換え、登録が無くなったサイトの記録を消し、ルールを更新して新たにブロック対象になったタブをブロックする（ファイルの検証とパスワード保護中のパスワードの照合を、どの書き込みよりも前に済ませる）
 * @param message data.data に設定ファイルの中身、data.password にパスワード保護中に照合するパスワード
 * @returns 成功時の skippedPresets は上限を超えるため取り込まなかったスタイルの名前、clearedActivePreset / clearedSchedulePresets はそのスタイルへの参照を外したか。失敗は invalid-request（形が違う・ファイルの中に許されない入れ子の組がある）/ password-required / password-mismatch / save-failed
 */
export const importSettingsHandler: MessageHandler<'import-settings'> = async ({
  data
}) => {
  const parsed = ImportSettingsBodySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const { data: imported, password } = parsed.data;
  const sites = toImportedSites(imported.sites);
  if (!sites) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const rejection = await checkUnblockPassword(password, true);
    if (rejection) return { success: false, error: passwordError(rejection) };

    const blockedBefore = await getRedirectedHosts();

    const { skippedPresets, clearedActivePreset, clearedSchedulePresets } =
      await importSettings(imported);
    const removedSites = await replaceSites(sites);
    for (const site of removedSites) {
      await purgeSite(site);
    }

    await updateBlockRulesAndBlockNewTargets(blockedBefore);

    return {
      success: true,
      skippedPresets,
      clearedActivePreset,
      clearedSchedulePresets
    };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
