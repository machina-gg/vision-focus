import React from 'react';

import { PasswordSettingsSection } from '~/components/options/PasswordSettingsSection';
import { NotificationSettingsSection } from '~/components/options/blocklist/NotificationSettingsSection';
import { SettingsDataPrivacy } from '~/components/options/SettingsDataPrivacy';
import { SettingsBackup } from '~/components/options/SettingsBackup';
import { useSettings } from '~/contexts/SettingsContext';
import type {
  AnalyticsOptIn,
  NotificationSettings,
  PasswordSettings,
  UnblockConfirmSettings
} from '~/types/storage';
import {
  DEFAULT_PASSWORD_SETTINGS,
  DEFAULT_UNBLOCK_CONFIRM_SETTINGS
} from '~/types/storage';

interface SettingsTabProps {
  onPasswordUpdate: (settings: PasswordSettings) => Promise<void>;
  onUnblockConfirmUpdate: (settings: UnblockConfirmSettings) => Promise<void>;
  onUpdateNotifications: (notifications: NotificationSettings) => void;
  onAnalyticsOptInChange: (optIn: AnalyticsOptIn) => Promise<void>;
  onSettingsChange: () => void;
}

export function SettingsTab({
  onPasswordUpdate,
  onUnblockConfirmUpdate,
  onUpdateNotifications,
  onAnalyticsOptInChange,
  onSettingsChange
}: SettingsTabProps) {
  const { settings } = useSettings();
  return (
    <div className="space-y-6">
      <PasswordSettingsSection
        passwordSettings={settings?.password ?? DEFAULT_PASSWORD_SETTINGS}
        onUpdate={onPasswordUpdate}
        holdSeconds={
          (settings?.unblockConfirm ?? DEFAULT_UNBLOCK_CONFIRM_SETTINGS)
            .holdSeconds
        }
        onUnblockConfirmUpdate={onUnblockConfirmUpdate}
      />

      <NotificationSettingsSection
        notifications={settings?.notifications}
        onUpdate={onUpdateNotifications}
      />

      <SettingsDataPrivacy
        settings={settings}
        onAnalyticsOptInChange={onAnalyticsOptInChange}
      />

      <SettingsBackup onSettingsChange={onSettingsChange} />
    </div>
  );
}
