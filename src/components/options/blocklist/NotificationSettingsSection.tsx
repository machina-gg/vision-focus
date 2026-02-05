import React, { useCallback } from 'react';
import { Bell } from 'lucide-react';

import { Card, Toggle, Select } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type {
  NotificationSettings,
  NotificationMinutes
} from '~/types/storage';

interface NotificationSettingsSectionProps {
  notifications: NotificationSettings | undefined;
  onUpdate: (notifications: NotificationSettings) => void;
  hasTimeLimitSites: boolean;
}

export function NotificationSettingsSection({
  notifications,
  onUpdate,
  hasTimeLimitSites
}: NotificationSettingsSectionProps) {
  const timeLimitEnabled = notifications?.timeLimitEnabled ?? true;
  const timeLimitMinutes = notifications?.timeLimitMinutes ?? 5;

  const minuteOptions: Array<{ value: string; label: string }> = [
    { value: '1', label: getMessage('notificationMinutesOption', '1') },
    { value: '3', label: getMessage('notificationMinutesOption', '3') },
    { value: '5', label: getMessage('notificationMinutesOption', '5') },
    { value: '10', label: getMessage('notificationMinutesOption', '10') }
  ];

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onUpdate({
        timeLimitEnabled: enabled,
        timeLimitMinutes
      });
    },
    [onUpdate, timeLimitMinutes]
  );

  const handleMinutesChange = useCallback(
    (value: string) => {
      const minutes = parseInt(value, 10) as NotificationMinutes;
      onUpdate({
        timeLimitEnabled,
        timeLimitMinutes: minutes
      });
    },
    [onUpdate, timeLimitEnabled]
  );

  // Only show if there are sites with time limits
  if (!hasTimeLimitSites) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900">
          {getMessage('notificationSettings')}
        </h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">
              {getMessage('notificationTimeLimitEnabled')}
            </p>
            <p className="text-sm text-gray-500">
              {getMessage('notificationTimeLimitEnabledDescription')}
            </p>
          </div>
          <Toggle checked={timeLimitEnabled} onChange={handleToggle} />
        </div>

        {timeLimitEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              {getMessage('notificationTimeLimitMinutes')}
            </label>
            <Select
              value={timeLimitMinutes.toString()}
              onChange={handleMinutesChange}
              options={minuteOptions}
              className="w-48"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
