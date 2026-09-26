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
export const importSettingsHandler: MessageHandler<'import-settings'> = async ({
  data
}) => {
  const parsed = ImportSettingsBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const current = await getSettings();

    const blockedBefore = await getActiveBlockedDomains();

    const settings = { ...current, ...parsed.data.settings } as AppSettings;
    await setSettings(settings);
    const { skipped } = await importSites(
      parsed.data.sites.map(toTrackedSite),
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
      }))
    };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
