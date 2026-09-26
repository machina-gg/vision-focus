import { useCallback, useState } from 'react';
import { sendMessage } from '~/lib/messaging';

import { trackFeatureUse } from '~/lib/analytics';
import { settingsItem } from '~/lib/storage';
import type {
  AppSettings,
  TimeLimit,
  NotificationSettings
} from '~/types/storage';

interface UseBlocklistOptions {
  settings: AppSettings | undefined;
  setSettings: (settings: AppSettings) => void;
}

interface UseBlocklistReturn {
  newDomain: string;
  setNewDomain: (value: string) => void;
  blockError: string;
  handleAddDomain: () => Promise<void>;
  handleRemoveDomain: (id: string) => Promise<void>;
  handleToggleDomain: (id: string, enabled: boolean) => Promise<void>;
  handleUpdateTimeLimit: (
    id: string,
    timeLimit: TimeLimit | null
  ) => Promise<void>;
  handleUpdateNotifications: (
    notifications: NotificationSettings
  ) => Promise<void>;
}

export function useBlocklist({
  settings,
  setSettings
}: UseBlocklistOptions): UseBlocklistReturn {
  const [newDomain, setNewDomain] = useState('');
  const [blockError, setBlockError] = useState('');

  // 形式の誤り・重複・入れ子の検査は background が行い、理由を error で返す。
  // 追跡中のサイトは background だけが書き、一覧は sites の監視で追従する
  const handleAddDomain = useCallback(async () => {
    if (!newDomain.trim()) return;

    try {
      const response = await sendMessage('add-block', {
        domain: newDomain.trim()
      });

      if (response.success) {
        trackFeatureUse('block_add');
        setNewDomain('');
        setBlockError('');
      } else {
        setBlockError(response.error || 'Failed to add domain');
      }
    } catch {
      setBlockError('Failed to add domain');
    }
  }, [newDomain]);

  const handleRemoveDomain = useCallback(async (id: string) => {
    try {
      await sendMessage('remove-block', { domain: id });
      trackFeatureUse('block_remove');
    } catch {
      // Silently handle error - list will refresh on next settings change
    }
  }, []);

  const handleToggleDomain = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await sendMessage('toggle-block', { domain: id, enabled });
      } catch {
        // Silently handle error - list will refresh on next settings change
      }
    },
    []
  );

  const handleUpdateTimeLimit = useCallback(
    async (id: string, timeLimit: TimeLimit | null) => {
      try {
        await sendMessage('update-time-limit', { domain: id, timeLimit });
      } catch {
        // Silently handle error - list will refresh on next settings change
      }
    },
    []
  );

  const handleUpdateNotifications = useCallback(
    async (notifications: NotificationSettings) => {
      if (!settings) return;

      try {
        const updatedSettings: AppSettings = {
          ...settings,
          notifications
        };
        await settingsItem.setValue(updatedSettings);
        setSettings(updatedSettings);
      } catch {
        // Silently handle error
      }
    },
    [settings, setSettings]
  );

  return {
    newDomain,
    setNewDomain,
    blockError,
    handleAddDomain,
    handleRemoveDomain,
    handleToggleDomain,
    handleUpdateTimeLimit,
    handleUpdateNotifications
  };
}
