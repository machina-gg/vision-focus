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
  isVisible: boolean;
  handleSupport: () => Promise<void>;
  handleDismiss: () => Promise<void>;
}

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
