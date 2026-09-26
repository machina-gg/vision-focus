import React from 'react';
import { Trash2, Shield } from 'lucide-react';

import { Button, Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { TimeLimitEditor } from './TimeLimitEditor';
import type { BlockedSite } from '~/lib/blockList';
import type { TimeLimit } from '~/types/storage';

interface DomainListItemProps {
  site: BlockedSite;
  blockCount: number;
  /** 今日（ローカル日付）そのサイトが表示されていた秒数 */
  usedSeconds: number;
  /** 操作の宛先はサイトキー */
  onToggle: (domain: string, enabled: boolean) => void;
  onRemove: (domain: string) => void;
  onUpdateTimeLimit: (domain: string, timeLimit: TimeLimit | null) => void;
}

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

      {/* Time Limit Editor */}
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
