import React, { useState, useCallback } from 'react';
import { Plus, Lock } from 'lucide-react';

import { Button, Card, Input } from '~/components/ui';
import {
  PasswordModal,
  UnblockConfirmModal
} from '~/components/options/modals';
import { getMessage } from '~/lib/i18n';
import {
  NotificationSettingsSection,
  YouTubeSection,
  DomainListItem
} from '~/components/options/blocklist';
import type {
  AppSettings,
  BlockItem,
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

  // Unblock confirmation modal state (for non-password flow)
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'toggle' | 'delete'>(
    'toggle'
  );
  const [pendingItem, setPendingItem] = useState<BlockItem | null>(null);

  const isPasswordProtected =
    settings?.password?.enabled && settings?.password?.passwordHash;

  // Get block style label for a block item
  const getBlockStyleLabel = useCallback((item: BlockItem): string => {
    if (item.timeLimit) {
      return item.timeLimit.type === 'daily'
        ? getMessage('dailyLimit')
        : getMessage('hourlyLimit');
    }
    return getMessage('alwaysBlocked');
  }, []);

  // Handle remove with password or confirmation check
  const handleRemoveClick = useCallback(
    (id: string) => {
      if (isPasswordProtected) {
        setPendingRemoveId(id);
        setShowPasswordModal(true);
      } else {
        const item = settings?.blockList.find((b) => b.id === id);
        if (item) {
          setPendingItem(item);
          setPendingAction('delete');
          setShowUnblockConfirm(true);
        }
      }
    },
    [isPasswordProtected, settings?.blockList]
  );

  // Handle toggle with password or confirmation check (only when disabling)
  const handleToggleClick = useCallback(
    (id: string, enabled: boolean) => {
      // Only require confirmation when disabling (turning off blocking)
      if (!enabled) {
        if (isPasswordProtected) {
          setPendingToggleId(id);
          setShowPasswordModal(true);
        } else {
          const item = settings?.blockList.find((b) => b.id === id);
          if (item) {
            setPendingItem(item);
            setPendingAction('toggle');
            setShowUnblockConfirm(true);
          }
        }
      } else {
        onToggleDomain(id, enabled);
      }
    },
    [isPasswordProtected, onToggleDomain, settings?.blockList]
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

  // Handle unblock confirmation
  const handleUnblockConfirm = useCallback(() => {
    if (!pendingItem) return;

    if (pendingAction === 'delete') {
      onRemoveDomain(pendingItem.id);
    } else {
      onToggleDomain(pendingItem.id, false);
    }
  }, [pendingItem, pendingAction, onRemoveDomain, onToggleDomain]);

  // Handle unblock confirm modal close
  const handleUnblockConfirmClose = useCallback(() => {
    setShowUnblockConfirm(false);
    setPendingItem(null);
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

      {/* Unblock Confirmation Modal (non-password flow) */}
      {pendingItem && (
        <UnblockConfirmModal
          isOpen={showUnblockConfirm}
          onClose={handleUnblockConfirmClose}
          onConfirm={handleUnblockConfirm}
          domain={pendingItem.domain}
          blockStyle={getBlockStyleLabel(pendingItem)}
          action={pendingAction}
        />
      )}
    </div>
  );
}
