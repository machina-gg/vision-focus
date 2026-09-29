import React from 'react';
import { X } from 'lucide-react';

import { Button, Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { AllowedSiteRow } from '~/lib/blockList';

/** AllowedSiteItem に渡す許可サイトの行と操作 */
interface AllowedSiteItemProps {
  /** 行に出す許可サイト */
  site: AllowedSiteRow;
  /** 削除ボタンが押されたときにドメインを受け取る */
  onRemove: (domain: string) => void;
  /** 「時間を記録する」が切り替わったときに、ドメインと切り替え後の状態を受け取る */
  onSetRecording: (domain: string, recordTime: boolean) => void;
}

/**
 * 許可サイト 1 件を、覆うブロックの補足・「時間を記録する」のスイッチ・削除ボタンとともに表示する
 * @param props 許可サイトの行と操作（各フィールドは AllowedSiteItemProps）
 * @returns 許可サイト一覧の 1 行
 */
export function AllowedSiteItem({
  site,
  onRemove,
  onSetRecording
}: AllowedSiteItemProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-3"
      data-testid="allowed-site-item"
    >
      <div className="min-w-0">
        <p
          className="font-medium text-gray-900 break-all"
          data-testid="allowed-site-item-domain"
        >
          {site.domain}
        </p>
        <p
          className="text-xs text-gray-500"
          data-testid="allowed-site-item-note"
        >
          {site.exceptionOf === null
            ? getMessage('allowedSiteNoBlock')
            : getMessage('allowedSiteExceptionOf', site.exceptionOf)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Toggle
          checked={site.recordTime}
          onChange={(checked) => onSetRecording(site.domain, checked)}
          label={getMessage('allowedSiteRecordTime')}
          size="sm"
          data-testid="allowed-site-item-record-toggle"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(site.domain)}
          aria-label={getMessage('removeAllowedSite')}
          data-testid="allowed-site-item-remove"
        >
          <X className="w-4 h-4 text-gray-500" />
        </Button>
      </div>
    </div>
  );
}
