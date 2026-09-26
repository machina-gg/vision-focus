import { useCallback } from 'react';
import { sendMessage } from '~/lib/messaging';

import type { YouTubeSettingsInput } from '~/types/messageSchemas';

interface UseYouTubeSettingsReturn {
  /** YouTube 設定画面の入力値の保存を background へ依頼する */
  handleYouTubeChange: (youtube: YouTubeSettingsInput) => Promise<void>;
}

/**
 * YouTube 設定の変更を background へ保存依頼する
 * @returns 保存を依頼する操作
 */
export function useYouTubeSettings(): UseYouTubeSettingsReturn {
  const handleYouTubeChange = useCallback(
    async (youtube: YouTubeSettingsInput) => {
      try {
        await sendMessage('update-youtube-settings', { youtube });
      } catch {
        // 失敗しても表示は次の sites の変更で同期される
      }
    },
    []
  );

  return { handleYouTubeChange };
}
