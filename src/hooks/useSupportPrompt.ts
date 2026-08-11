import { useCallback, useEffect, useState } from 'react';

import { trackFeatureUse } from '~/lib/analytics';
import {
  dismissSupportPrompt,
  getSupportPromptState,
  markSupportPromptOpened,
  openSupportPage,
  shouldShowSupportPrompt
} from '~/lib/supportPrompt';

export interface UseSupportPromptReturn {
  /** 支援誘導を表示するか（判定が終わるまでは false） */
  isVisible: boolean;
  /** 支援ページを開く。以降この誘導は表示されない */
  handleSupport: () => Promise<void>;
  /** 誘導を閉じる。一定期間は再表示されない */
  handleDismiss: () => Promise<void>;
}

/**
 * レポート下の支援誘導の表示制御
 *
 * 表示頻度の判定は `shouldShowSupportPrompt` に寄せてあり、
 * このフックは storage の読み書きと UI 状態の橋渡しだけを行う。
 */
export function useSupportPrompt(): UseSupportPromptReturn {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const state = await getSupportPromptState();
      if (cancelled) return;
      setIsVisible(shouldShowSupportPrompt(state, Date.now()));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSupport = useCallback(async () => {
    setIsVisible(false);
    await markSupportPromptOpened();
    void trackFeatureUse('support_open');
    openSupportPage();
  }, []);

  const handleDismiss = useCallback(async () => {
    setIsVisible(false);
    await dismissSupportPrompt(Date.now());
  }, []);

  return { isVisible, handleSupport, handleDismiss };
}
