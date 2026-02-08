import { useCallback, useState } from 'react';
import { sendToBackground } from '@plasmohq/messaging';

import { trackFeatureUse } from '~/lib/analytics';
import { parseDomainInput } from '~/lib/domain';
import { canAddToBlocklist } from '~/lib/license';
import { storage } from '~/lib/storage';
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

  const handleAddDomain = useCallback(async () => {
    if (!settings || !newDomain.trim()) return;

    const limitCheck = await canAddToBlocklist(settings.blockList.length);
    if (!limitCheck.allowed) {
      setBlockError(
        limitCheck.reason || `Limit reached: ${limitCheck.limit} sites`
      );
      return;
    }

    const parsed = parseDomainInput(newDomain);
    if (!parsed) {
      setBlockError('Invalid domain format');
      return;
    }

    if (settings.blockList.some((item) => item.domain === parsed.domain)) {
      setBlockError('Domain already in block list');
      return;
    }

    try {
      const response = await sendToBackground({
        name: 'add-block',
        body: { domain: newDomain.trim() }
      });

      if (response.success) {
        trackFeatureUse('block_add');
        setNewDomain('');
        setBlockError('');
        const updatedSettings = await storage.get<AppSettings>('settings');
        if (updatedSettings) {
          setSettings(updatedSettings);
        }
      } else {
        setBlockError(response.error || 'Failed to add domain');
      }
    } catch {
      setBlockError('Failed to add domain');
    }
  }, [settings, newDomain, setSettings]);

  const handleRemoveDomain = useCallback(
    async (id: string) => {
      try {
        await sendToBackground({ name: 'remove-block', body: { id } });
        trackFeatureUse('block_remove');
        const updatedSettings = await storage.get<AppSettings>('settings');
        if (updatedSettings) {
          setSettings(updatedSettings);
        }
      } catch {
        // Silently handle error - list will refresh on next settings change
      }
    },
    [setSettings]
  );

  const handleToggleDomain = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await sendToBackground({ name: 'toggle-block', body: { id, enabled } });
        const updatedSettings = await storage.get<AppSettings>('settings');
        if (updatedSettings) {
          setSettings(updatedSettings);
        }
      } catch {
        // Silently handle error - list will refresh on next settings change
      }
    },
    [setSettings]
  );

  const handleUpdateTimeLimit = useCallback(
    async (id: string, timeLimit: TimeLimit | null) => {
      try {
        await sendToBackground({
          name: 'update-time-limit',
          body: { id, timeLimit }
        });
        const updatedSettings = await storage.get<AppSettings>('settings');
        if (updatedSettings) {
          setSettings(updatedSettings);
        }
      } catch {
        // Silently handle error - list will refresh on next settings change
      }
    },
    [setSettings]
  );

  const handleUpdateNotifications = useCallback(
    async (notifications: NotificationSettings) => {
      if (!settings) return;

      try {
        const updatedSettings: AppSettings = {
          ...settings,
          notifications
        };
        await storage.set('settings', updatedSettings);
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
