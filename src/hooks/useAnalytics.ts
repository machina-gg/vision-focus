import { useCallback, useState } from 'react';

import { sendMessage } from '~/lib/messaging';
import type { TrackedSite } from '~/types/site';

interface UseAnalyticsReturn {
  addSiteError: string;
  handleReblock: (site: TrackedSite) => Promise<void>;
  handleResetAnalytics: () => Promise<void>;
  handleStopTracking: (site: TrackedSite) => Promise<void>;
  handleRefreshAnalytics: () => Promise<void>;
  handleAddSiteToTrack: (domain: string) => Promise<boolean>;
}

const ADD_SITE_FAILED = 'Failed to add site';

export function useAnalytics(): UseAnalyticsReturn {
  const [addSiteError, setAddSiteError] = useState('');

  // add-block は既存のブロック設定を重複として拒否するので、無効にしたサイトはトグルで戻す
  const handleReblock = useCallback(async (site: TrackedSite) => {
    try {
      if (site.block === null) {
        await sendMessage('add-block', { domain: site.domain });
      } else if (!site.block.enabled) {
        await sendMessage('toggle-block', {
          domain: site.domain,
          enabled: true
        });
      }
    } catch {
      // Silently handle error
    }
  }, []);

  const handleResetAnalytics = useCallback(async () => {
    try {
      await sendMessage('reset-activity');
    } catch {
      // Silently handle error
    }
  }, []);

  const handleStopTracking = useCallback(async (site: TrackedSite) => {
    try {
      await sendMessage('stop-tracking', { domain: site.domain });
    } catch {
      // Silently handle error
    }
  }, []);

  const handleRefreshAnalytics = useCallback(async () => {}, []);

  const handleAddSiteToTrack = useCallback(async (domain: string) => {
    try {
      const response = await sendMessage('add-tracked-site', { domain });
      if (!response.success) {
        setAddSiteError(response.error || ADD_SITE_FAILED);
        return false;
      }
      setAddSiteError('');
      return true;
    } catch {
      setAddSiteError(ADD_SITE_FAILED);
      return false;
    }
  }, []);

  return {
    addSiteError,
    handleReblock,
    handleResetAnalytics,
    handleStopTracking,
    handleRefreshAnalytics,
    handleAddSiteToTrack
  };
}
