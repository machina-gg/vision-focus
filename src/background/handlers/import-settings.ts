import type { MessageHandler } from '~/lib/messaging';
import { getSettings, setSettings } from '~/lib/storage';
import { getActiveBlockedDomains } from '~/lib/blockService';
import { importSites } from '~/lib/siteService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import {
  ImportSettingsBodySchema,
  type ImportSettingsBody
} from '~/types/messageSchemas';
import type { AppSettings } from '~/types/storage';
import type { TrackedSite } from '~/types/site';

type ImportedSite = ImportSettingsBody['sites'][number];

/** 検証済みの値を保存形にそろえる（null の項目を省略形のまま保存しない） */
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

/**
 * インポートした設定を保存するメッセージハンドラ。
 *
 * ブロックリストの操作（add-block / toggle-block）や YouTube 設定
 * （update-youtube-settings）と同じく、保存と既存タブのブロックを background 側で
 * 完結させる（画面から保存すると開いているタブが置き換わらない）。
 *
 * 全体の設定は画面側が applyImportedSettings で組み立てた適用後の値を受け取る。
 * 追跡中のサイトは既存とのマージ（入れ子の拒否を含む）をここで行う。書き手を
 * background に 1 つに保つため。スタイル（vision）はブロック判定に関わらないため、ここでは扱わない
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

    // 検証は looseObject なので、未知のキーも含めて適用後の設定として保存する
    const settings = { ...current, ...parsed.data.settings } as AppSettings;
    await setSettings(settings);
    const { skipped } = await importSites(
      parsed.data.sites.map(toTrackedSite),
      new Date()
    );

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

    return {
      success: true,
      skipped: skipped.map(({ input, nested }) => ({
        domain: input,
        conflict: nested.site
      }))
    };
  } catch {
    return { success: false, error: 'Failed to import settings' };
  }
};
