import React from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';

import { Button, Card, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { AppSettings, SiteBlockCount } from '~/types/storage';

interface BlocklistTabProps {
  settings: AppSettings | undefined;
  newDomain: string;
  setNewDomain: (value: string) => void;
  blockError: string;
  onAddDomain: () => void;
  onRemoveDomain: (id: string) => void;
  siteBlockCounts?: Record<string, SiteBlockCount>;
}

export function BlocklistTab({
  settings,
  newDomain,
  setNewDomain,
  blockError,
  onAddDomain,
  onRemoveDomain,
  siteBlockCounts = {}
}: BlocklistTabProps) {
  return (
    <div className="space-y-6">
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
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.isWildcard && (
                          <span className="text-blue-600">*.</span>
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
                    onClick={() => onRemoveDomain(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
