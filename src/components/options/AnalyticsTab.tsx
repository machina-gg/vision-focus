import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { Card, Button, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { trackedSiteKeys } from '~/lib/siteService';
import type { ActivityLog } from '~/types/activity';
import type { TrackedSite, TrackedSites } from '~/types/site';

import {
  AnalyticsExportBar,
  SiteRankingList,
  AnalyticsSummary,
  AnalyticsDateFilter
} from './analytics';

/** AnalyticsTab に渡す集計元のデータと各操作 */
interface AnalyticsTabProps {
  /** 日別・サイト別の閲覧時間とブロック回数の記録 */
  activity: ActivityLog;
  /** 登録済みのサイト（計測・ブロックの状態を含む） */
  trackedSites: TrackedSites;
  /** 一覧のサイトをブロックに戻すときに、そのサイトを受け取る */
  onReblock: (site: TrackedSite) => void;
  /** 計測データの削除を求められたときに呼ぶ */
  onReset: () => void;
  /** 一覧のサイトの計測をやめるときに、そのサイトを受け取る */
  onStopTracking: (site: TrackedSite) => void;
  /** 計測データの読み直しを求められたときに呼ぶ */
  onRefresh: () => Promise<void>;
  /** 小文字にしたドメインを受け取って計測対象に加え、加えられたら true を返す（true なら入力欄を空に戻す） */
  onAddSite: (domain: string) => Promise<boolean>;
  /** 計測対象の追加に失敗した理由（空なら出さない） */
  addSiteError: string;
  /** true なら期間別のレポートの下に支援の呼びかけを出す */
  isSupportPromptVisible: boolean;
  /** 支援の呼びかけで支援ボタンが押されたときに呼ぶ */
  onSupport: () => Promise<void>;
  /** 支援の呼びかけが閉じられたときに呼ぶ */
  onDismissSupport: () => Promise<void>;
}

/**
 * 設定画面の分析タブ（書き出し・サイト別の順位・計測対象の追加・計測中のサイト一覧・期間別のレポート）を表示する
 * @param props 集計元のデータと各操作（各フィールドは AnalyticsTabProps）
 * @returns 分析タブの中身
 */
export function AnalyticsTab({
  activity,
  trackedSites,
  onReblock,
  onReset,
  onStopTracking,
  onRefresh,
  onAddSite,
  addSiteError,
  isSupportPromptVisible,
  onSupport,
  onDismissSupport
}: AnalyticsTabProps) {
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const sites = useMemo(() => trackedSiteKeys(trackedSites), [trackedSites]);

  const handleAddSite = async () => {
    const domain = newSiteDomain.trim().toLowerCase();
    if (!domain) return;
    if (await onAddSite(domain)) {
      setNewSiteDomain('');
    }
  };

  return (
    <div className="space-y-6">
      <AnalyticsExportBar
        activity={activity}
        trackedSites={trackedSites}
        onRefresh={onRefresh}
        onReset={onReset}
      />

      <SiteRankingList activity={activity} sites={sites} />

      <Card>
        <h3
          className="text-sm font-medium text-gray-700 mb-3"
          data-testid="analytics-add-site-heading"
        >
          {getMessage('addSiteToTrack')}
        </h3>
        <div className="flex gap-2">
          <Input
            data-testid="analytics-add-site-input"
            value={newSiteDomain}
            onChange={(value) => setNewSiteDomain(value)}
            placeholder={getMessage('trackSitePlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
            className="flex-1"
          />
          <Button
            data-testid="analytics-add-site-button"
            variant="primary"
            onClick={handleAddSite}
            disabled={!newSiteDomain.trim()}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {getMessage('add')}
          </Button>
        </div>
        {addSiteError && (
          <p
            className="mt-2 text-sm text-danger-600"
            data-testid="analytics-add-site-error"
          >
            {addSiteError}
          </p>
        )}
      </Card>

      <AnalyticsSummary
        activity={activity}
        trackedSites={trackedSites}
        onReblock={onReblock}
        onStopTracking={onStopTracking}
      />

      <AnalyticsDateFilter
        activity={activity}
        sites={sites}
        isSupportPromptVisible={isSupportPromptVisible}
        onSupport={onSupport}
        onDismissSupport={onDismissSupport}
      />
    </div>
  );
}
