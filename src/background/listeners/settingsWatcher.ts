import { storage } from '~/lib/storage';
import { STORAGE_SETTLE_DELAY_MS } from '~/constants/intervals';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import type { AppSettings } from '~/types/storage';

// Track previous settings to detect block-related changes
let previousSettings: AppSettings | null = null;

/**
 * settings storage の変更を監視し、ブロックルールを更新する
 * ブロック関連の設定が有効化された場合は既存タブもブロックする
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

      // Check if any block-related setting was enabled
      let shouldBlockExisting = false;

      if (previousSettings) {
        // Check if YouTube blockAccess was enabled
        const prevYouTubeBlock =
          previousSettings.youtube?.enabled &&
          previousSettings.youtube?.blockAccess;
        const newYouTubeBlock =
          newSettings.youtube?.enabled && newSettings.youtube?.blockAccess;
        if (!prevYouTubeBlock && newYouTubeBlock) {
          shouldBlockExisting = true;
        }

        // Check if any block item was enabled
        const prevEnabledIds = new Set(
          previousSettings.blockList
            .filter((item) => item.enabled)
            .map((item) => item.id)
        );
        const newEnabledIds = new Set(
          newSettings.blockList
            .filter((item) => item.enabled)
            .map((item) => item.id)
        );
        for (const id of newEnabledIds) {
          if (!prevEnabledIds.has(id)) {
            shouldBlockExisting = true;
            break;
          }
        }

        // Check if paused was disabled (re-enabling blocks)
        if (previousSettings.paused && !newSettings.paused) {
          shouldBlockExisting = true;
        }
      }

      // Update block rules
      await updateBlockRules();

      // Block existing tabs if a block was enabled
      if (shouldBlockExisting) {
        await blockExistingTabs();
      }

      // Update previous settings
      previousSettings = newSettings;
    }
  });
}
