import { useCallback } from 'react';
import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';

import type { YouTubeSettingsInput } from '~/types/messageSchemas';

interface UseYouTubeSettingsReturn {
  /** YouTube 設定画面の入力値の保存を background へ依頼する（パスワード保護中にアクセスのブロックを外すときは password を添える）。失敗の文言、保存したら null を返す */
  handleYouTubeChange: (
    youtube: YouTubeSettingsInput,
    password?: string
  ) => Promise<string | null>;
}

/**
 * YouTube 設定の変更を background へ保存依頼する
 * @returns 保存を依頼する操作
 */
export function useYouTubeSettings(): UseYouTubeSettingsReturn {
  const handleYouTubeChange = useCallback(
    async (youtube: YouTubeSettingsInput, password?: string) => {
      try {
        const response = await sendMessage('update-youtube-settings', {
          youtube,
          password
        });
        return response.success ? null : messageErrorText(response.error);
      } catch {
        return messageErrorText(undefined);
      }
    },
    []
  );

  return { handleYouTubeChange };
}
