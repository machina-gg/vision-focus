// Report generation logic for weekly and monthly reports

import type { AnalyticsData, DailyStat, SiteTime } from '~/types/storage';
import type { WeeklyReport, MonthlyReport } from '~/types/report';

// Get the start of the week (Monday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get the end of the week (Sunday) for a given date
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// Format date to YYYY-MM-DD
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Format date to YYYY-MM
function formatMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

// Get all dates in a range
function getDatesInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Get top sites by time from SiteTime data
function getTopSites(
  siteTime: Record<string, SiteTime>,
  category: 'waste' | 'invest',
  limit: number = 5
): { domain: string; time: number }[] {
  return Object.values(siteTime)
    .filter((site) => site.category === category)
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)
    .map((site) => ({ domain: site.domain, time: site.time }));
}

// Calculate trend based on comparing first half vs second half of data
function calculateTrend(
  data: { wasteTime: number; investTime: number }[]
): 'improving' | 'declining' | 'stable' {
  if (data.length < 2) {
    return 'stable';
  }

  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint);
  const secondHalf = data.slice(midpoint);

  // Calculate productivity ratio (invest / (waste + invest))
  const calcRatio = (items: { wasteTime: number; investTime: number }[]) => {
    const totalWaste = items.reduce((sum, item) => sum + item.wasteTime, 0);
    const totalInvest = items.reduce((sum, item) => sum + item.investTime, 0);
    const total = totalWaste + totalInvest;
    return total > 0 ? totalInvest / total : 0;
  };

  const firstRatio = calcRatio(firstHalf);
  const secondRatio = calcRatio(secondHalf);
  const change = secondRatio - firstRatio;

  // Threshold for determining trend (5% change)
  const threshold = 0.05;

  if (change > threshold) {
    return 'improving';
  } else if (change < -threshold) {
    return 'declining';
  }
  return 'stable';
}

// Generate weekly report
export function generateWeeklyReport(
  analytics: AnalyticsData,
  weekOffset: number = 0 // 0 = current week, -1 = last week, etc.
): WeeklyReport | null {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + weekOffset * 7);

  const weekStart = getWeekStart(targetDate);
  const weekEnd = getWeekEnd(targetDate);
  const dates = getDatesInRange(weekStart, weekEnd);

  // Collect daily stats for this week
  const dailyBreakdown: DailyStat[] = dates.map((date) => {
    const stat = analytics.dailyStats[date];
    return (
      stat || {
        date,
        wasteTime: 0,
        investTime: 0,
        blockCount: 0
      }
    );
  });

  // Calculate totals
  const totalWasteTime = dailyBreakdown.reduce(
    (sum, day) => sum + day.wasteTime,
    0
  );
  const totalInvestTime = dailyBreakdown.reduce(
    (sum, day) => sum + day.investTime,
    0
  );
  const totalBlockCount = dailyBreakdown.reduce(
    (sum, day) => sum + day.blockCount,
    0
  );

  // Only return null if there's absolutely no data
  const hasData = totalWasteTime > 0 || totalInvestTime > 0 || totalBlockCount > 0;
  if (!hasData && weekOffset < 0) {
    // For past weeks, return null if no data
    return null;
  }

  // Get top sites
  const topWasteSites = getTopSites(analytics.siteTime, 'waste');
  const topInvestSites = getTopSites(analytics.siteTime, 'invest');

  // Calculate trend
  const trend = calculateTrend(
    dailyBreakdown.map((d) => ({
      wasteTime: d.wasteTime,
      investTime: d.investTime
    }))
  );

  return {
    weekStart: formatDateKey(weekStart),
    weekEnd: formatDateKey(weekEnd),
    totalWasteTime,
    totalInvestTime,
    totalBlockCount,
    dailyBreakdown,
    topWasteSites,
    topInvestSites,
    trend
  };
}

// Generate monthly report
export function generateMonthlyReport(
  analytics: AnalyticsData,
  monthOffset: number = 0 // 0 = current month, -1 = last month, etc.
): MonthlyReport | null {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);

  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  const dates = getDatesInRange(monthStart, monthEnd);

  // Calculate totals
  let totalWasteTime = 0;
  let totalInvestTime = 0;
  let totalBlockCount = 0;

  dates.forEach((date) => {
    const stat = analytics.dailyStats[date];
    if (stat) {
      totalWasteTime += stat.wasteTime;
      totalInvestTime += stat.investTime;
      totalBlockCount += stat.blockCount;
    }
  });

  // Only return null if there's absolutely no data
  const hasData = totalWasteTime > 0 || totalInvestTime > 0 || totalBlockCount > 0;
  if (!hasData && monthOffset < 0) {
    // For past months, return null if no data
    return null;
  }

  // Generate weekly breakdown
  const weeklyBreakdown: {
    weekStart: string;
    wasteTime: number;
    investTime: number;
  }[] = [];

  const initialWeekStart = getWeekStart(monthStart);
  for (
    let weekStartMs = initialWeekStart.getTime();
    weekStartMs <= monthEnd.getTime();
    weekStartMs += 7 * 24 * 60 * 60 * 1000
  ) {
    const currentWeekStart = new Date(weekStartMs);
    const weekEndDate = new Date(currentWeekStart);
    weekEndDate.setDate(currentWeekStart.getDate() + 6);

    const weekDates = getDatesInRange(
      currentWeekStart < monthStart ? monthStart : currentWeekStart,
      weekEndDate > monthEnd ? monthEnd : weekEndDate
    );

    let weekWaste = 0;
    let weekInvest = 0;

    weekDates.forEach((date) => {
      const stat = analytics.dailyStats[date];
      if (stat) {
        weekWaste += stat.wasteTime;
        weekInvest += stat.investTime;
      }
    });

    weeklyBreakdown.push({
      weekStart: formatDateKey(currentWeekStart),
      wasteTime: weekWaste,
      investTime: weekInvest
    });
  }

  // Get top sites
  const topWasteSites = getTopSites(analytics.siteTime, 'waste');
  const topInvestSites = getTopSites(analytics.siteTime, 'invest');

  // Calculate trend
  const trend = calculateTrend(weeklyBreakdown);

  return {
    month: formatMonthKey(targetDate),
    totalWasteTime,
    totalInvestTime,
    totalBlockCount,
    weeklyBreakdown,
    topWasteSites,
    topInvestSites,
    trend
  };
}

// Get formatted week range string
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const startMonth = start.toLocaleDateString(undefined, { month: 'short' });
  const endMonth = end.toLocaleDateString(undefined, { month: 'short' });

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
}

// Get formatted month string
export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}
