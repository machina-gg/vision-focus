import { useCallback } from 'react';
import { sendMessage } from '~/lib/messaging';

import type { YouTubeSettingsInput } from '~/types/messageSchemas';

interface UseYouTubeSettingsReturn {
  handleYouTubeChange: (youtube: YouTubeSettingsInput) => Promise<void>;
}

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
