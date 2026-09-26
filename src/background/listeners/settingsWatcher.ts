import { settingsItem, sitesItem } from '~/lib/storage';
import { STORAGE_SETTLE_DELAY_MS } from '~/constants/intervals';
import { updateBlockRules } from '../blocker';

/**
 * 全体の設定（settings）と追跡中のサイト（sites）の変更を監視し、ブロックルールを再生成する。
 * ブロックの判定は両方を読む（一時停止・スケジュールは settings、サイトごとのブロック設定は sites）。
 *
 * 既存タブのブロックはここでは行わない。ブロックを有効化する操作は
 * すべて background のメッセージハンドラ（add-block / toggle-block /
 * toggle-pause / update-youtube-settings / import-settings）を通り、そこで blockExistingTabs()
 * を呼ぶため
 */
export function setupSettingsWatcher(): void {
  // background の監視は拡張機能が動いている間ずっと必要なため、
  // 戻り値の unwatch は使わない
  const rebuild = async (newValue: unknown) => {
    // Small delay to ensure storage is fully updated
    await new Promise((resolve) =>
      setTimeout(resolve, STORAGE_SETTLE_DELAY_MS)
    );

    if (!newValue) return;

    await updateBlockRules();
  };
  settingsItem.watch(rebuild);
  sitesItem.watch(rebuild);
}
