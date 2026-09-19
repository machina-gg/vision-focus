import { useCallback } from 'react';
import { sendToBackground } from '@plasmohq/messaging';

import { storage } from '~/lib/storage';
import {
  YOUTUBE_DOMAIN,
  incrementYouTubeBlockCount
} from '~/lib/youtubeBlockService';
import type {
  AppSettings,
  UnblockHistory,
  YouTubeSettings
} from '~/types/storage';
import { DEFAULT_UNBLOCK_HISTORY } from '~/types/storage';

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
        const response = await sendToBackground({
          name: 'update-youtube-settings',
          body: { youtube }
        });

        // 保存に失敗したときは表示を更新しない（画面は保存済みの値のまま残る）
        if (!response?.success) return;

        const updatedSettings = await storage.get<AppSettings>('settings');
        if (updatedSettings) {
          setSettings(updatedSettings);
        }

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

/** 追跡履歴を取得する（未保存なら既定値を返す） */
async function getUnblockHistory(): Promise<UnblockHistory> {
  const history = await storage.get<UnblockHistory>('unblockHistory');
  return history ?? DEFAULT_UNBLOCK_HISTORY;
}

/** YouTube をブロック中として追跡履歴に記録する */
async function markYouTubeBlocked(): Promise<void> {
  const history = await getUnblockHistory();
  history.sites[YOUTUBE_DOMAIN] = {
    domain: YOUTUBE_DOMAIN,
    status: 'blocked',
    blockedAt: new Date().toISOString(),
    unblockedAt: null,
    timeAfterUnblock: 0,
    lastActivity: null
  };
  await storage.set('unblockHistory', history);
}

/** YouTube のブロック解除を追跡履歴に記録する */
async function markYouTubeUnblocked(): Promise<void> {
  const history = await getUnblockHistory();
  const now = new Date().toISOString();
  const existing = history.sites[YOUTUBE_DOMAIN];

  if (existing) {
    existing.status = 'unblocked';
    existing.unblockedAt = now;
  } else {
    history.sites[YOUTUBE_DOMAIN] = {
      domain: YOUTUBE_DOMAIN,
      status: 'unblocked',
      blockedAt: now,
      unblockedAt: now,
      timeAfterUnblock: 0,
      lastActivity: null
    };
  }

  await storage.set('unblockHistory', history);
}
