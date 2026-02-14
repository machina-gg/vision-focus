import React, { useMemo, useState, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';

import { Card } from '~/components/ui';
import {
  UpgradePrompt,
  WeeklyReportCard,
  MonthlyReportCard
} from '~/components/features';
import { generateWeeklyReport, generateMonthlyReport } from '~/lib/report';
import { getMessage } from '~/lib/i18n';
import type { AnalyticsData } from '~/types/storage';

interface AnalyticsDateFilterProps {
  analyticsData: AnalyticsData;
  isPremium: boolean;
}

export function AnalyticsDateFilter({
  analyticsData,
  isPremium
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

  if (isPremium) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
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

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-premium-100 rounded-lg">
          <BarChart3 className="w-5 h-5 text-premium-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {getMessage('reportsSection')}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {getMessage('reportsPremiumDescription')}
          </p>
          <div className="mt-4">
            <UpgradePrompt
              variant="inline"
              features={[
                getMessage('weeklyReport'),
                getMessage('monthlyReport'),
                getMessage('productivityImproving').replace('!', '')
              ]}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
