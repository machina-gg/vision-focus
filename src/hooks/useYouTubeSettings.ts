import { useCallback } from 'react';
import { sendMessage } from '~/lib/messaging';

import type { YouTubeSettingsInput } from '~/types/messageSchemas';

interface UseYouTubeSettingsReturn {
  handleYouTubeChange: (youtube: YouTubeSettingsInput) => Promise<void>;
}

/**
 * YouTube 設定の保存を担うフック。
 *
 * 保存は background の update-youtube-settings ハンドラが youtube.com の追跡中のサイトへ行い、
 * 画面は `sites` の監視で表示を追従させる（画面から保存領域には書かない）。
 * ハンドラ側で保存・ブロックルールの更新・既存タブのブロック・解除の記録までを
 * 一続きで処理するため、ブロックの有効化が開いているタブにも届く
 */
export function useYouTubeSettings(): UseYouTubeSettingsReturn {
  const handleYouTubeChange = useCallback(
    async (youtube: YouTubeSettingsInput) => {
      try {
        await sendMessage('update-youtube-settings', { youtube });
      } catch {
        // 送信に失敗しても画面は保存済みの値のまま残す
        // （次の sites の変更で表示は同期される）
      }
    },
    []
  );

  return { handleYouTubeChange };
}
