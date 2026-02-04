import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Shield, Clock, ChevronDown, ChevronUp, Bell, Lock } from 'lucide-react';

import { Button, Card, Input, Toggle, Select } from '~/components/ui';
import { PasswordModal } from '~/components/options/modals';
import { TimeLimitBadge } from '~/components/features';
import { getMessage } from '~/lib/i18n';
import { TIME_LIMIT_CONFIG } from '~/constants/limits';
import type {
  AppSettings,
  SiteBlockCount,
  BlockItem,
  TimeLimit,
  TimeLimitType,
  TimeLimitUsage,
  NotificationSettings,
  NotificationMinutes
} from '~/types/storage';

interface BlocklistTabProps {
  settings: AppSettings | undefined;
  newDomain: string;
  setNewDomain: (value: string) => void;
  blockError: string;
  onAddDomain: () => void;
  onRemoveDomain: (id: string) => void;
  onToggleDomain: (id: string, enabled: boolean) => void;
  onUpdateTimeLimit: (id: string, timeLimit: TimeLimit | null) => void;
  onUpdateNotifications: (notifications: NotificationSettings) => void;
  siteBlockCounts?: Record<string, SiteBlockCount>;
  timeLimitUsage?: Record<string, TimeLimitUsage>;
}

type LimitTypeOption = 'always' | 'daily' | 'hourly';

interface TimeLimitEditorProps {
  item: BlockItem;
  onUpdate: (timeLimit: TimeLimit | null) => void;
  usage?: TimeLimitUsage;
}

function TimeLimitEditor({ item, onUpdate, usage }: TimeLimitEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentType: LimitTypeOption = item.timeLimit
    ? item.timeLimit.type
    : 'always';
  const currentMinutes = item.timeLimit
    ? Math.floor(item.timeLimit.limitSeconds / 60)
    : currentType === 'daily'
      ? TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60
      : TIME_LIMIT_CONFIG.DEFAULT_HOURLY_LIMIT / 60;

  const [selectedType, setSelectedType] = useState<LimitTypeOption>(currentType);
  const [minutes, setMinutes] = useState(currentMinutes);

  const handleTypeChange = useCallback(
    (newType: LimitTypeOption) => {
      setSelectedType(newType);

      if (newType === 'always') {
        onUpdate(null);
      } else {
        const defaultMinutes =
          newType === 'daily'
            ? TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60
            : TIME_LIMIT_CONFIG.DEFAULT_HOURLY_LIMIT / 60;
        setMinutes(defaultMinutes);
        onUpdate({
          type: newType as TimeLimitType,
          limitSeconds: defaultMinutes * 60
        });
      }
    },
    [onUpdate]
  );

  const handleMinutesChange = useCallback(
    (value: string) => {
      const newMinutes = parseInt(value, 10);
      if (isNaN(newMinutes) || newMinutes < 1) return;

      const clampedMinutes = Math.min(
        Math.max(newMinutes, TIME_LIMIT_CONFIG.MIN_LIMIT_SECONDS / 60),
        TIME_LIMIT_CONFIG.MAX_LIMIT_SECONDS / 60
      );
      setMinutes(clampedMinutes);

      if (selectedType !== 'always') {
        onUpdate({
          type: selectedType as TimeLimitType,
          limitSeconds: clampedMinutes * 60
        });
      }
    },
    [selectedType, onUpdate]
  );

  const typeOptions = [
    { value: 'always', label: getMessage('alwaysBlocked') },
    { value: 'daily', label: getMessage('dailyLimit') },
    { value: 'hourly', label: getMessage('hourlyLimit') }
  ];

  // Calculate remaining time for display
  const remainingSeconds =
    item.timeLimit && usage
      ? item.timeLimit.limitSeconds -
        (item.timeLimit.type === 'daily'
          ? usage.dailyUsedSeconds
          : usage.hourlyUsedSeconds)
      : null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <Clock className="w-3 h-3" />
        {item.timeLimit ? (
          <span>
            {getMessage('limitMinutes', minutes.toString())}
            {item.timeLimit.type === 'daily'
              ? getMessage('perDay')
              : getMessage('perHour')}
          </span>
        ) : (
          <span>{getMessage('alwaysBlocked')}</span>
        )}
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {getMessage('timeLimitType')}
            </label>
            <Select
              value={selectedType}
              onChange={(value) => handleTypeChange(value as LimitTypeOption)}
              options={typeOptions}
            />
          </div>

          {selectedType !== 'always' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {getMessage('timeLimitDuration')}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={minutes.toString()}
                  onChange={handleMinutesChange}
                  min={1}
                  max={TIME_LIMIT_CONFIG.MAX_LIMIT_SECONDS / 60}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">
                  {getMessage('minutes')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {selectedType === 'daily'
                  ? getMessage('resetDaily')
                  : getMessage('resetHourly')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Show remaining time badge if time limit is set and item is enabled */}
      {item.enabled && item.timeLimit && remainingSeconds !== null && (
        <div className="mt-2">
          <TimeLimitBadge
            remainingSeconds={Math.max(0, remainingSeconds)}
            limitSeconds={item.timeLimit.limitSeconds}
            limitType={item.timeLimit.type}
            compact
          />
        </div>
      )}
    </div>
  );
}

// Notification settings section component
interface NotificationSettingsProps {
  notifications: NotificationSettings | undefined;
  onUpdate: (notifications: NotificationSettings) => void;
  hasTimeLimitSites: boolean;
}

function NotificationSettingsSection({
  notifications,
  onUpdate,
  hasTimeLimitSites
}: NotificationSettingsProps) {
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
          <Toggle
            checked={timeLimitEnabled}
            onChange={handleToggle}
          />
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

export function BlocklistTab({
  settings,
  newDomain,
  setNewDomain,
  blockError,
  onAddDomain,
  onRemoveDomain,
  onToggleDomain,
  onUpdateTimeLimit,
  onUpdateNotifications,
  siteBlockCounts = {},
  timeLimitUsage = {}
}: BlocklistTabProps) {
  // Password protection state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);

  const isPasswordProtected =
    settings?.password?.enabled && settings?.password?.passwordHash;

  // Handle remove with password check
  const handleRemoveClick = useCallback(
    (id: string) => {
      if (isPasswordProtected) {
        setPendingRemoveId(id);
        setShowPasswordModal(true);
      } else {
        onRemoveDomain(id);
      }
    },
    [isPasswordProtected, onRemoveDomain]
  );

  // Handle toggle with password check (only when disabling)
  const handleToggleClick = useCallback(
    (id: string, enabled: boolean) => {
      // Only require password when disabling (turning off blocking)
      if (!enabled && isPasswordProtected) {
        setPendingToggleId(id);
        setShowPasswordModal(true);
      } else {
        onToggleDomain(id, enabled);
      }
    },
    [isPasswordProtected, onToggleDomain]
  );

  // Handle password confirmation success
  const handlePasswordSuccess = useCallback(() => {
    if (pendingRemoveId) {
      onRemoveDomain(pendingRemoveId);
      setPendingRemoveId(null);
    }
    if (pendingToggleId) {
      onToggleDomain(pendingToggleId, false);
      setPendingToggleId(null);
    }
  }, [pendingRemoveId, pendingToggleId, onRemoveDomain, onToggleDomain]);

  // Handle modal close
  const handlePasswordModalClose = useCallback(() => {
    setShowPasswordModal(false);
    setPendingRemoveId(null);
    setPendingToggleId(null);
  }, []);

  // Check if any sites have time limits configured
  const hasTimeLimitSites =
    settings?.blockList.some((item) => item.timeLimit !== null && item.timeLimit !== undefined) ??
    false;

  return (
    <div className="space-y-6">
      {/* Notification Settings - only show if time limit sites exist */}
      <NotificationSettingsSection
        notifications={settings?.notifications}
        onUpdate={onUpdateNotifications}
        hasTimeLimitSites={hasTimeLimitSites}
      />

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {getMessage('addSiteToBlock')}
        </h2>
        <div className="flex gap-2">
          <Input
            value={newDomain}
            onChange={setNewDomain}
            placeholder={getMessage('domainPlaceholder')}
            className="flex-1"
          />
          <Button onClick={onAddDomain}>
            <Plus className="w-4 h-4 mr-1" />
            {getMessage('add')}
          </Button>
        </div>
        {blockError && (
          <p className="mt-2 text-sm text-red-600">{blockError}</p>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {getMessage('blockedSites')}
        </h2>
        {settings?.blockList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {getMessage('noBlockedSites')}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {settings?.blockList.map((item) => {
              const domainKey = item.isWildcard
                ? item.domain.replace('*.', '')
                : item.domain;
              const blockCount =
                siteBlockCounts[domainKey]?.count ??
                siteBlockCounts[item.domain]?.count ??
                0;
              const usage =
                timeLimitUsage[domainKey] ?? timeLimitUsage[item.domain];

              return (
                <div key={item.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Toggle
                        checked={item.enabled}
                        onChange={(checked) => handleToggleClick(item.id, checked)}
                        size="sm"
                      />
                      <div>
                        <p
                          className={`font-medium ${item.enabled ? 'text-gray-900' : 'text-gray-400'}`}
                        >
                          {item.isWildcard && (
                            <span
                              className={
                                item.enabled ? 'text-blue-600' : 'text-blue-300'
                              }
                            >
                              *.
                            </span>
                          )}
                          {item.domain}
                        </p>
                        <p className="text-xs text-gray-500">
                          Added {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {blockCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          <Shield className="w-3 h-3" />
                          {getMessage('blockedTimesShort', blockCount.toString())}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveClick(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  {/* Time Limit Editor */}
                  <div className="ml-11">
                    <TimeLimitEditor
                      item={item}
                      onUpdate={(timeLimit) => onUpdateTimeLimit(item.id, timeLimit)}
                      usage={usage}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Password Protection Indicator */}
      {isPasswordProtected && (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <Lock className="w-4 h-4" />
          <span>{getMessage('passwordProtectionActive')}</span>
        </div>
      )}

      {/* Password Modal */}
      {isPasswordProtected && settings?.password?.passwordHash && (
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={handlePasswordModalClose}
          onSuccess={handlePasswordSuccess}
          passwordHash={settings.password.passwordHash}
          title={getMessage('passwordRequiredForUnblock')}
          description={getMessage('passwordRequiredForUnblockDescription')}
        />
      )}
    </div>
  );
}
