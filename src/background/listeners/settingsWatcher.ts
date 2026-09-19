import { settingsItem } from '~/lib/storage';
import { STORAGE_SETTLE_DELAY_MS } from '~/constants/intervals';
import { updateBlockRules } from '../blocker';

/**
 * settings storage の変更を監視し、ブロックルールを再生成する。
 *
 * 既存タブのブロックはここでは行わない。ブロックを有効化する操作は
 * すべて background のメッセージハンドラ（add-block / toggle-block /
 * toggle-pause / update-youtube-settings）を通り、そこで blockExistingTabs()
 * を呼ぶため（#392）
 */
export function setupSettingsWatcher(): void {
  // background の監視は拡張機能が動いている間ずっと必要なため、
  // 戻り値の unwatch は使わない
  settingsItem.watch(async (newSettings) => {
    // Small delay to ensure storage is fully updated
    await new Promise((resolve) =>
      setTimeout(resolve, STORAGE_SETTLE_DELAY_MS)
    );

    if (!newSettings) return;

    await updateBlockRules();
  });
}
