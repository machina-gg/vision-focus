import { useCallback } from 'react';
import { sendMessage } from '~/lib/messaging';

import {
  getSettings,
  getUnblockHistory,
  unblockHistoryItem
} from '~/lib/storage';
import {
  YOUTUBE_DOMAIN,
  incrementYouTubeBlockCount
} from '~/lib/youtubeBlockService';
import type {
  AppSettings,
  TrackedSite,
  YouTubeSettings
} from '~/types/storage';

interface UseYouTubeSettingsOptions {
  settings: AppSettings | undefined;
  setSettings: (settings: AppSettings) => void;
}

interface UseYouTubeSettingsReturn {
  handleYouTubeChange: (youtube: YouTubeSettings) => Promise<void>;
}

/**
 * YouTube 設定の保存を担うフック。
 *
 * 保存は background の update-youtube-settings ハンドラが行い、
 * 画面側は保存後の設定を読み直して表示へ反映する。
 * ハンドラ側で保存・ブロックルールの更新・既存タブのブロックまでを
 * 一続きで処理するため、ブロックの有効化が開いているタブにも届く（#392）
 */
export function useYouTubeSettings({
  settings,
  setSettings
}: UseYouTubeSettingsOptions): UseYouTubeSettingsReturn {
  const handleYouTubeChange = useCallback(
    async (youtube: YouTubeSettings) => {
      if (!settings) return;

      const prevEnabled = settings.youtube?.enabled ?? false;
      const newEnabled = youtube.enabled;

      try {
        const response = await sendMessage('update-youtube-settings', {
          youtube
        });

        // 保存に失敗したときは表示を更新しない（画面は保存済みの値のまま残る）
        if (!response?.success) return;

        setSettings(await getSettings());

        // YouTube ブロックの有効・無効の切り替えを追跡履歴に記録する
        if (!prevEnabled && newEnabled) {
          await incrementYouTubeBlockCount();
          await markYouTubeBlocked();
        } else if (prevEnabled && !newEnabled) {
          await markYouTubeUnblocked();
        }
      } catch {
        // 送信や読み直しに失敗しても画面は保存済みの値のまま残す
        // （次の settings の変更で表示は同期される）
      }
    },
    [settings, setSettings]
  );

  return { handleYouTubeChange };
}

/**
 * 追跡履歴の 1 サイト分を差し替えて保存する。
 *
 * 未保存のときに読み出せる履歴は共有の既定値なので、
 * 破壊的に書き換えず新しい履歴を組んでから保存する
 */
async function saveTrackedSite(site: TrackedSite): Promise<void> {
  const current = await getUnblockHistory();
  await unblockHistoryItem.setValue({
    sites: { ...current.sites, [site.domain]: site }
  });
}

/** YouTube をブロック中として追跡履歴に記録する */
async function markYouTubeBlocked(): Promise<void> {
  await saveTrackedSite({
    domain: YOUTUBE_DOMAIN,
    status: 'blocked',
    blockedAt: new Date().toISOString(),
    unblockedAt: null,
    timeAfterUnblock: 0,
    lastActivity: null
  });
}

/** YouTube のブロック解除を追跡履歴に記録する */
async function markYouTubeUnblocked(): Promise<void> {
  const now = new Date().toISOString();
  const existing = (await getUnblockHistory()).sites[YOUTUBE_DOMAIN];

  await saveTrackedSite({
    ...(existing ?? {
      domain: YOUTUBE_DOMAIN,
      blockedAt: now,
      timeAfterUnblock: 0,
      lastActivity: null
    }),
    domain: YOUTUBE_DOMAIN,
    status: 'unblocked',
    unblockedAt: now
  });
}
