import React, { useMemo, useState, useCallback } from 'react';

import { Card } from '~/components/ui';
import { WeeklyReportCard, MonthlyReportCard } from '~/components/features';
import { generateWeeklyReport, generateMonthlyReport } from '~/lib/report';
import { getMessage } from '~/lib/i18n';
import type { AnalyticsData } from '~/types/storage';

interface AnalyticsDateFilterProps {
  analyticsData: AnalyticsData;
}

export function AnalyticsDateFilter({
  analyticsData
}: AnalyticsDateFilterProps) {
  const [weeklyOffset, setWeeklyOffset] = useState(0);
  const [monthlyOffset, setMonthlyOffset] = useState(0);

  const weeklyReport = useMemo(() => {
    return generateWeeklyReport(analyticsData, weeklyOffset);
  }, [analyticsData, weeklyOffset]);

  const monthlyReport = useMemo(() => {
    return generateMonthlyReport(analyticsData, monthlyOffset);
  }, [analyticsData, monthlyOffset]);

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
      <div className="grid md:grid-cols-2 gap-6">
        <WeeklyReportCard
          report={weeklyReport}
          onPrevious={handlePreviousWeek}
          onNext={handleNextWeek}
          canGoNext={weeklyOffset < 0}
          isCurrentWeek={weeklyOffset === 0}
        />
        <MonthlyReportCard
          report={monthlyReport}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
          canGoNext={monthlyOffset < 0}
          isCurrentMonth={monthlyOffset === 0}
        />
      </div>
    </Card>
  );
}
