import { settingsItem, sitesItem } from '~/lib/storage';
import { STORAGE_SETTLE_DELAY_MS } from '~/constants/intervals';
import { updateBlockRules } from '../blocker';

// 開いているタブのブロックはしない。ブロックを有効にする操作は、呼ぶ側のメッセージハンドラが行う
export function setupSettingsWatcher(): void {
  const rebuild = async (newValue: unknown) => {
    await new Promise((resolve) =>
      setTimeout(resolve, STORAGE_SETTLE_DELAY_MS)
    );

    if (!newValue) return;

    await updateBlockRules();
  };
  settingsItem.watch(rebuild);
  sitesItem.watch(rebuild);
}
