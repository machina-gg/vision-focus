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

interface AnalyticsDateFilterProps {
  activity: ActivityLog;
  sites: readonly SiteKey[];
  isSupportPromptVisible: boolean;
  onSupport: () => Promise<void>;
  onDismissSupport: () => Promise<void>;
}

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
