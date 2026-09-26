import React from 'react';
import { Trash2, Shield } from 'lucide-react';

import { Button, Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { TimeLimitEditor } from './TimeLimitEditor';
import type { BlockedSite } from '~/lib/blockList';
import type { TimeLimit } from '~/types/storage';

/** DomainListItem に渡すブロック中のサイトと操作 */
interface DomainListItemProps {
  /** 行に出すブロック設定つきのサイト */
  site: BlockedSite;
  /** そのサイトをブロックした回数（0 なら回数を出さない） */
  blockCount: number;
  /** そのサイトの今日の使用時間（秒。時間制限の残りの計算に使う） */
  usedSeconds: number;
  /** 有効・無効のスイッチが切り替わったときに、ドメインと切り替え後の状態を受け取る */
  onToggle: (domain: string, enabled: boolean) => void;
  /** 削除ボタンが押されたときにドメインを受け取る */
  onRemove: (domain: string) => void;
  /** 時間制限が保存されたときに、ドメインと新しい制限を受け取る（null なら常にブロック） */
  onUpdateTimeLimit: (domain: string, timeLimit: TimeLimit | null) => void;
}

/**
 * ブロック中のサイト 1 件を、有効・無効のスイッチ・追加日・ブロック回数・削除ボタン・時間制限の編集欄とともに表示する
 * @param props ブロック中のサイトと操作（各フィールドは DomainListItemProps）
 * @returns ブロック一覧の 1 行
 */
export function DomainListItem({
  site,
  blockCount,
  usedSeconds,
  onToggle,
  onRemove,
  onUpdateTimeLimit
}: DomainListItemProps) {
  return (
    <div className="py-3" data-testid="blocklist-item">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Toggle
            checked={site.block.enabled}
            onChange={(checked) => onToggle(site.domain, checked)}
            size="sm"
            data-testid="blocklist-item-toggle"
          />
          <div>
            <p
              data-testid="blocklist-item-domain"
              className={`font-medium ${site.block.enabled ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {site.domain}
            </p>
            <p className="text-xs text-gray-500">
              Added {new Date(site.block.addedAt).toLocaleDateString()}
            </p>
          </div>
          {blockCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger-100 text-danger-700 text-xs rounded-full">
              <Shield className="w-3 h-3" />
              {getMessage('blockedTimesShort', blockCount.toString())}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(site.domain)}
          data-testid="blocklist-item-remove"
        >
          <Trash2 className="w-4 h-4 text-danger-500" />
        </Button>
      </div>

      <div className="ml-11">
        <TimeLimitEditor
          site={site}
          onUpdate={(timeLimit) => onUpdateTimeLimit(site.domain, timeLimit)}
          usedSeconds={usedSeconds}
        />
      </div>
    </div>
  );
}
