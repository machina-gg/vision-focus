import { useCallback, useState } from 'react';
import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';

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

/** ブロックリスト画面の操作（追加・削除・有効切り替え・時間制限・通知設定）と追加欄の入力状態を提供する */
export function useBlocklist({
  settings,
  setSettings
}: UseBlocklistOptions): UseBlocklistReturn {
  const [newDomain, setNewDomain] = useState('');
  const [blockError, setBlockError] = useState('');

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
        setBlockError(messageErrorText(response.error));
      }
    } catch {
      setBlockError(messageErrorText(undefined));
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
