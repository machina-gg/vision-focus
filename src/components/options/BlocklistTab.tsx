import React, { useCallback, useMemo } from 'react';
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
import { blockCountsByDomain } from '~/hooks/useActivityStats';
import { secondsOnDay } from '~/lib/activityStats';
import { blockListSites } from '~/lib/blockList';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import { toDateKey } from '~/lib/time';
import type { TimeLimit } from '~/types/storage';
import type { ActivityLog } from '~/types/activity';
import type { YouTubeSettingsInput } from '~/types/messageSchemas';
import type { TrackedSites } from '~/types/site';

/** BlocklistTab に渡す追加欄の状態・ブロック対象のデータと各操作 */
interface BlocklistTabProps {
  /** 追加欄に入力中のドメイン */
  newDomain: string;
  /** 追加欄の入力が変わったときに受け取る */
  setNewDomain: (value: string) => void;
  /** 追加に失敗した理由（空なら出さない） */
  blockError: string;
  /** 追加ボタンが押されたときに呼ぶ */
  onAddDomain: () => void;
  /** 解除の確認（パスワード・長押し）を通ったあとに、削除するドメインを受け取る */
  onRemoveDomain: (domain: string) => void;
  /** 有効・無効の切り替えを受け取る（無効にするときは解除の確認を通ったあとに呼ぶ） */
  onToggleDomain: (domain: string, enabled: boolean) => void;
  /** ドメインの時間制限の変更を受け取る（null なら制限を外す） */
  onUpdateTimeLimit: (domain: string, timeLimit: TimeLimit | null) => void;
  /** 今日の使用時間とブロック回数を出すための記録 */
  activity: ActivityLog;
  /** 登録済みのサイト（ブロック設定のあるものを一覧に出す） */
  trackedSites: TrackedSites;
  /** YouTube の個別設定の変更を受け取る */
  onYouTubeChange: (youtube: YouTubeSettingsInput) => void;
}

/**
 * 設定画面のブロックタブ（追加欄・ブロック中のサイト一覧・YouTube の設定）を表示し、解除にはパスワードと長押しの確認を挟む
 * @param props 追加欄の状態・ブロック対象のデータと各操作（各フィールドは BlocklistTabProps）
 * @returns ブロックタブの中身と、解除の確認用のモーダル
 */
export function BlocklistTab({
  newDomain,
  setNewDomain,
  blockError,
  onAddDomain,
  onRemoveDomain,
  onToggleDomain,
  onUpdateTimeLimit,
  activity,
  trackedSites,
  onYouTubeChange
}: BlocklistTabProps) {
  const { settings } = useSettings();

  const isPasswordProtected = Boolean(
    settings?.password?.enabled && settings?.password?.passwordHash
  );
  const unblockGuard = useUnblockGuard(isPasswordProtected);
  const { requestUnblock } = unblockGuard;
  const now = new Date();
  const today = toDateKey(now);
  const blockList = useMemo(() => blockListSites(trackedSites), [trackedSites]);
  const blockCounts = blockCountsByDomain(activity, blockList, now);

  const handleRemoveClick = useCallback(
    (domain: string) => {
      const block = trackedSites[domain]?.block;
      if (!block) return;
      requestUnblock({
        domain,
        timeLimit: block.timeLimit,
        action: 'delete',
        onConfirm: () => onRemoveDomain(domain)
      });
    },
    [requestUnblock, onRemoveDomain, trackedSites]
  );

  const handleToggleClick = useCallback(
    (domain: string, enabled: boolean) => {
      if (enabled) {
        onToggleDomain(domain, enabled);
        return;
      }
      const block = trackedSites[domain]?.block;
      if (!block) return;
      requestUnblock({
        domain,
        timeLimit: block.timeLimit,
        action: 'toggle',
        onConfirm: () => onToggleDomain(domain, false)
      });
    },
    [requestUnblock, onToggleDomain, trackedSites]
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
          // 読み込み完了時に画面が跳ねないよう、読み込み中も一覧の枠（Card）は出したままにする
          <div
            role="status"
            className="flex flex-col items-center justify-center gap-2 py-8"
          >
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">{getMessage('loading')}</p>
          </div>
        ) : blockList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {getMessage('noBlockedSites')}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {blockList.map((site) => (
              <DomainListItem
                key={site.domain}
                site={site}
                blockCount={blockCounts[site.domain] ?? 0}
                usedSeconds={secondsOnDay(activity, site.domain, today)}
                onToggle={handleToggleClick}
                onRemove={handleRemoveClick}
                onUpdateTimeLimit={onUpdateTimeLimit}
              />
            ))}
          </div>
        )}
      </Card>

      <YouTubeSection
        site={trackedSites[YOUTUBE_DOMAIN] ?? null}
        onYouTubeChange={onYouTubeChange}
        onRequestUnblock={requestUnblock}
      />

      {isPasswordProtected && (
        <div className="flex items-center gap-2 text-sm text-block-600">
          <Lock className="w-4 h-4" />
          <span>{getMessage('passwordProtectionActive')}</span>
        </div>
      )}

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
