import { storage } from '~/lib/storage';
import { STORAGE_SETTLE_DELAY_MS } from '~/constants/intervals';
import { updateBlockRules } from '../blocker';
import type { AppSettings } from '~/types/storage';

/**
 * settings storage の変更を監視し、ブロックルールを再生成する。
 *
 * 既存タブのブロックはここでは行わない。ブロックを有効化する操作は
 * すべて background のメッセージハンドラ（add-block / toggle-block /
 * toggle-pause / update-youtube-settings）を通り、そこで blockExistingTabs()
 * を呼ぶため（#392）
 */
export function setupSettingsWatcher(): void {
  storage.watch({
    settings: async (change) => {
      // Small delay to ensure storage is fully updated
      await new Promise((resolve) =>
        setTimeout(resolve, STORAGE_SETTLE_DELAY_MS)
      );

      const newSettings = change.newValue as AppSettings;
      if (!newSettings) return;

      await updateBlockRules();
    }
  });
}
