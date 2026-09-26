import React, { useMemo, useState, useCallback } from 'react';

import { Card, Tabs } from '~/components/ui';
import {
  WeeklyReportCard,
  MonthlyReportCard,
  SupportPrompt
} from '~/components/features';
import { generateWeeklyReport, generateMonthlyReport } from '~/lib/report';
import { getMessage } from '~/lib/i18n';
import type { ActivityLog } from '~/types/activity';
import type { SiteKey } from '~/types/site';

/** Tabs の data-testid は `tab-${id}` になるため、設定画面上部のタブの id と重ならない名前にする */
const REPORT_TABS = {
  WEEKLY: 'report-weekly',
  MONTHLY: 'report-monthly'
} as const;

type ReportTab = (typeof REPORT_TABS)[keyof typeof REPORT_TABS];

const isReportTab = (tabId: string): tabId is ReportTab =>
  tabId === REPORT_TABS.WEEKLY || tabId === REPORT_TABS.MONTHLY;

/** AnalyticsDateFilter に渡す集計元と支援の呼びかけの操作 */
interface AnalyticsDateFilterProps {
  /** 日別・サイト別の閲覧時間とブロック回数の記録 */
  activity: ActivityLog;
  /** レポートの集計に含めるサイト */
  sites: readonly SiteKey[];
  /** true ならレポートの下に支援の呼びかけを出す */
  isSupportPromptVisible: boolean;
  /** 支援の呼びかけで支援ボタンが押されたときに呼ぶ */
  onSupport: () => Promise<void>;
  /** 支援の呼びかけが閉じられたときに呼ぶ */
  onDismissSupport: () => Promise<void>;
}

/**
 * 週と月のレポートをタブで切り替えて表示し、前後の期間へ移動できるようにする（今の期間より先へは進めない）
 * @param props 集計元と支援の呼びかけの操作（各フィールドは AnalyticsDateFilterProps）
 * @returns レポートのカード
 */
export function AnalyticsDateFilter({
  activity,
  sites,
  isSupportPromptVisible,
  onSupport,
  onDismissSupport
}: AnalyticsDateFilterProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>(REPORT_TABS.WEEKLY);
  const [weeklyOffset, setWeeklyOffset] = useState(0);
  const [monthlyOffset, setMonthlyOffset] = useState(0);

  const weeklyReport = useMemo(() => {
    return generateWeeklyReport(activity, sites, weeklyOffset);
  }, [activity, sites, weeklyOffset]);

  const monthlyReport = useMemo(() => {
    return generateMonthlyReport(activity, sites, monthlyOffset);
  }, [activity, sites, monthlyOffset]);

  const handlePreviousWeek = useCallback(() => {
    setWeeklyOffset((prev) => prev - 1);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeeklyOffset((prev) => Math.min(prev + 1, 0));
  }, []);

  const handlePreviousMonth = useCallback(() => {
    setMonthlyOffset((prev) => prev - 1);
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonthlyOffset((prev) => Math.min(prev + 1, 0));
  }, []);

  return (
    <Card>
      <h3
        className="text-lg font-semibold text-gray-900 mb-4"
        data-testid="analytics-reports-heading"
      >
        {getMessage('reportsSection')}
      </h3>
      <Tabs
        tabs={[
          { id: REPORT_TABS.WEEKLY, label: getMessage('weeklyReport') },
          { id: REPORT_TABS.MONTHLY, label: getMessage('monthlyReport') }
        ]}
        activeTab={activeTab}
        onChange={(tabId) => {
          if (isReportTab(tabId)) {
            setActiveTab(tabId);
          }
        }}
        className="mb-4"
      />
      {activeTab === REPORT_TABS.WEEKLY ? (
        <WeeklyReportCard
          report={weeklyReport}
          onPrevious={handlePreviousWeek}
          onNext={handleNextWeek}
          canGoNext={weeklyOffset < 0}
          isCurrentWeek={weeklyOffset === 0}
        />
      ) : (
        <MonthlyReportCard
          report={monthlyReport}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
          canGoNext={monthlyOffset < 0}
          isCurrentMonth={monthlyOffset === 0}
        />
      )}

      {isSupportPromptVisible && (
        <SupportPrompt onSupport={onSupport} onDismiss={onDismissSupport} />
      )}
    </Card>
  );
}
