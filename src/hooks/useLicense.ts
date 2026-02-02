import { useCallback } from 'react';

import { openPaymentPage, openManagementPage } from '~/lib/extpay';

interface UseLicenseReturn {
  handleUpgrade: () => void;
  handleManageSubscription: () => void;
}

export function useLicense(): UseLicenseReturn {
  const handleUpgrade = useCallback(() => {
    openPaymentPage();
  }, []);

  const handleManageSubscription = useCallback(() => {
    openManagementPage();
  }, []);

  return {
    handleUpgrade,
    handleManageSubscription
  };
}
