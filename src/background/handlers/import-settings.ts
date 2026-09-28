import type { MessageHandler } from '~/lib/messaging';
import { getActiveBlockedDomains } from '~/lib/blockService';
import { importSettings } from '~/lib/settingsService';
import { importSites } from '~/lib/siteService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import {
  ImportSettingsBodySchema,
  type ImportSettingsBody
} from '~/types/messageSchemas';
import type { TrackedSite } from '~/types/site';

type ImportedSite = ImportSettingsBody['data']['sites'][string];

function toTrackedSite(site: ImportedSite): TrackedSite {
  return {
    domain: site.domain,
    trackedAt: site.trackedAt,
    block: site.block
      ? {
          enabled: site.block.enabled,
          addedAt: site.block.addedAt,
          timeLimit: site.block.timeLimit ?? null
        }
      : null,
    youtube: site.youtube ?? null
  };
}

// 保存は background で完結させる（画面から保存すると開いているタブが置き換わらない）
/**
 * import-settings: 設定ファイルの設定・表示設定とサイトを取り込み、ルールを更新して新たにブロック対象になったタブをブロックする
 * @param message data.data に設定ファイルの中身（重ね合わせは保存済みの最新の値に対して行う）
 * @returns 成功時の skipped は既存のサイトと入れ子になるため取り込まなかったドメイン（conflict はぶつかった既存のサイト）、skippedPresets は上限を超えるため取り込まなかったスタイルの名前、clearedActivePreset / clearedSchedulePresets はそのスタイルへの参照を外したか。失敗は invalid-request / save-failed
 */
export const importSettingsHandler: MessageHandler<'import-settings'> = async ({
  data
}) => {
  const parsed = ImportSettingsBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const imported = parsed.data.data;

    const blockedBefore = await getActiveBlockedDomains();

    const { skippedPresets, clearedActivePreset, clearedSchedulePresets } =
      await importSettings(imported);
    const { skipped } = await importSites(
      Object.values(imported.sites).map(toTrackedSite),
      new Date()
    );

    await updateBlockRules();

    // 件数では比べない（有効化・時間制限や一時停止の解除でも、件数を変えずに対象が増える）
    const blockedAfter = await getActiveBlockedDomains();
    const hasNewlyBlocked = blockedAfter.some(
      (domain) => !blockedBefore.includes(domain)
    );

    // ルール更新は新規の遷移にしか効かないため、開いているタブは明示的にブロックする
    if (hasNewlyBlocked) {
      await blockExistingTabs();
    }

    return {
      success: true,
      skipped: skipped.map(({ input, nested }) => ({
        domain: input,
        conflict: nested.site
      })),
      skippedPresets,
      clearedActivePreset,
      clearedSchedulePresets
    };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
