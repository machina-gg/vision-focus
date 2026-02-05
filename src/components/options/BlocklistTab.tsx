import React, { useState, useCallback } from 'react';
import { Plus, Lock } from 'lucide-react';

import { Button, Card, Input } from '~/components/ui';
import { PasswordModal } from '~/components/options/modals';
import { getMessage } from '~/lib/i18n';
import {
  NotificationSettingsSection,
  YouTubeSection,
  DomainListItem
} from '~/components/options/blocklist';
import type {
  AppSettings,
  SiteBlockCount,
  TimeLimit,
  TimeLimitUsage,
  NotificationSettings,
  YouTubeSettings
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
  youtube: YouTubeSettings;
  onYouTubeChange: (youtube: YouTubeSettings) => void;
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
  timeLimitUsage = {},
  youtube,
  onYouTubeChange
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
    settings?.blockList.some(
      (item) => item.timeLimit !== null && item.timeLimit !== undefined
    ) ?? false;

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
          <p className="mt-2 text-sm text-danger-600">{blockError}</p>
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
                <DomainListItem
                  key={item.id}
                  item={item}
                  blockCount={blockCount}
                  usage={usage}
                  onToggle={handleToggleClick}
                  onRemove={handleRemoveClick}
                  onUpdateTimeLimit={onUpdateTimeLimit}
                />
              );
            })}
          </div>
        )}
      </Card>

      {/* YouTube In-App Blocking Section */}
      <YouTubeSection youtube={youtube} onYouTubeChange={onYouTubeChange} />

      {/* Password Protection Indicator */}
      {isPasswordProtected && (
        <div className="flex items-center gap-2 text-sm text-block-600">
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
