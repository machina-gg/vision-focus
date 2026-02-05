import React from 'react';
import { Trash2, Shield } from 'lucide-react';

import { Button, Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { TimeLimitEditor } from './TimeLimitEditor';
import type { BlockItem, TimeLimit, TimeLimitUsage } from '~/types/storage';

interface DomainListItemProps {
  item: BlockItem;
  blockCount: number;
  usage: TimeLimitUsage | undefined;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
  onUpdateTimeLimit: (id: string, timeLimit: TimeLimit | null) => void;
}

export function DomainListItem({
  item,
  blockCount,
  usage,
  onToggle,
  onRemove,
  onUpdateTimeLimit
}: DomainListItemProps) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Toggle
            checked={item.enabled}
            onChange={(checked) => onToggle(item.id, checked)}
            size="sm"
          />
          <div>
            <p
              className={`font-medium ${item.enabled ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {item.isWildcard && (
                <span
                  className={item.enabled ? 'text-blue-600' : 'text-blue-300'}
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
        <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)}>
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
}
