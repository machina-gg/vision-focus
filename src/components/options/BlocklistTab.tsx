import React, { useCallback } from 'react';
import { Plus, Lock } from 'lucide-react';

import { Button, Card, Input } from '~/components/ui';
import {
  PasswordModal,
  UnblockConfirmModal
} from '~/components/options/modals';
import { getMessage } from '~/lib/i18n';
import { YouTubeSection, DomainListItem } from '~/components/options/blocklist';
import { useSettings } from '~/contexts/SettingsContext';
import { useUnblockGuard } from '~/hooks/useUnblockGuard';
import { secondsOnDay, siteTotals } from '~/lib/activityStats';
import { normalizeSiteKey } from '~/lib/siteKey';
import { toDateKey } from '~/lib/time';
import type { TimeLimit, YouTubeSettings } from '~/types/storage';
import type { ActivityLog, DateRange } from '~/types/activity';

// ブロック回数は事実の表にある全期間で数える（保持期間を過ぎた日は表から消える）
const WHOLE_LOG: DateRange = { from: '0000-01-01', to: '9999-12-31' };

interface BlocklistTabProps {
  newDomain: string;
  setNewDomain: (value: string) => void;
  blockError: string;
  onAddDomain: () => void;
  onRemoveDomain: (id: string) => void;
  onToggleDomain: (id: string, enabled: boolean) => void;
  onUpdateTimeLimit: (id: string, timeLimit: TimeLimit | null) => void;
  /** 事実の表。ブロック回数と時間制限の今日の使用量をここから導出する */
  activity: ActivityLog;
  youtube: YouTubeSettings;
  onYouTubeChange: (youtube: YouTubeSettings) => void;
}

export function BlocklistTab({
  newDomain,
  setNewDomain,
  blockError,
  onAddDomain,
  onRemoveDomain,
  onToggleDomain,
  onUpdateTimeLimit,
  activity,
  youtube,
  onYouTubeChange
}: BlocklistTabProps) {
  const { settings } = useSettings();

  const isPasswordProtected = Boolean(
    settings?.password?.enabled && settings?.password?.passwordHash
  );
  const unblockGuard = useUnblockGuard(isPasswordProtected);
  const { requestUnblock } = unblockGuard;
  const today = toDateKey(new Date());

  const handleRemoveClick = useCallback(
    (id: string) => {
      const item = settings?.blockList.find((b) => b.id === id);
      if (!item) return;
      requestUnblock({
        domain: item.domain,
        timeLimit: item.timeLimit,
        action: 'delete',
        onConfirm: () => onRemoveDomain(id)
      });
    },
    [requestUnblock, onRemoveDomain, settings?.blockList]
  );

  // ブロックを弱める向き（無効化）だけ確認を通す。有効化は即時に反映する
  const handleToggleClick = useCallback(
    (id: string, enabled: boolean) => {
      if (enabled) {
        onToggleDomain(id, enabled);
        return;
      }
      const item = settings?.blockList.find((b) => b.id === id);
      if (!item) return;
      requestUnblock({
        domain: item.domain,
        timeLimit: item.timeLimit,
        action: 'toggle',
        onConfirm: () => onToggleDomain(id, false)
      });
    },
    [requestUnblock, onToggleDomain, settings?.blockList]
  );

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {getMessage('addSiteToBlock')}
        </h2>
        <div className="flex gap-2">
          <Input
            data-testid="blocklist-domain-input"
            value={newDomain}
            onChange={setNewDomain}
            placeholder={getMessage('domainPlaceholder')}
            containerClassName="flex-1 min-w-0"
            className="text-base py-2.5"
          />
          <Button
            data-testid="blocklist-add-button"
            onClick={onAddDomain}
            className="shrink-0"
          >
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
        {settings === undefined ? (
          // 設定がまだ読めていない状態。未登録（0 件）の案内と取り違えないよう別の表示にする。
          // 一覧の枠（Card）は出したままにして、読み込み完了時に画面が跳ねないようにする
          <div
            role="status"
            className="flex flex-col items-center justify-center gap-2 py-8"
          >
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">{getMessage('loading')}</p>
          </div>
        ) : settings.blockList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {getMessage('noBlockedSites')}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {settings.blockList.map((item) => {
              // 判定と同じサイトキーで引く（ワイルドカード・www. 付きでも同じ行になる）
              const site = normalizeSiteKey(item.domain);

              return (
                <DomainListItem
                  key={item.id}
                  item={item}
                  blockCount={siteTotals(activity, site, WHOLE_LOG).blocks}
                  usedSeconds={secondsOnDay(activity, site, today)}
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
      <YouTubeSection
        youtube={youtube}
        onYouTubeChange={onYouTubeChange}
        onRequestUnblock={requestUnblock}
      />

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
          isOpen={unblockGuard.isPasswordModalOpen}
          onClose={unblockGuard.close}
          onSuccess={unblockGuard.confirm}
          passwordHash={settings.password.passwordHash}
          title={getMessage('passwordRequiredForUnblock')}
          description={getMessage('passwordRequiredForUnblockDescription')}
        />
      )}

      {/* Unblock Confirmation Modal (non-password flow) */}
      {unblockGuard.pending && settings && (
        <UnblockConfirmModal
          isOpen={unblockGuard.isConfirmModalOpen}
          onClose={unblockGuard.close}
          onConfirm={unblockGuard.confirm}
          domain={unblockGuard.pending.domain}
          blockStyle={unblockGuard.pending.blockStyle}
          action={unblockGuard.pending.action}
          holdSeconds={settings.unblockConfirm.holdSeconds}
        />
      )}
    </div>
  );
}
