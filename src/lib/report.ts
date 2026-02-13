// Report generation logic for weekly and monthly reports

import type {
  AnalyticsData,
  DailyStat,
  SiteBlockCount,
  SiteUnblockCount,
  SiteTime
} from '~/types/storage';
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

// Get top blocked sites from siteBlockCounts data
function getTopBlockedSites(
  siteBlockCounts: Record<string, SiteBlockCount>,
  limit: number = 5
): { domain: string; count: number }[] {
  return Object.values(siteBlockCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((site) => ({ domain: site.domain, count: site.count }));
}

// Get top unblocked sites from siteUnblockCounts data
function getTopUnblockedSites(
  siteUnblockCounts: Record<string, SiteUnblockCount>,
  limit: number = 5
): { domain: string; count: number }[] {
  return Object.values(siteUnblockCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((site) => ({ domain: site.domain, count: site.count }));
}

// Calculate trend based on comparing waste time between first half vs second half
// If waste time decreases in second half, that's "improving"
function calculateTrend(
  data: { wasteTime: number }[]
): 'improving' | 'declining' | 'stable' {
  if (data.length < 2) {
    return 'stable';
  }

  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint);
  const secondHalf = data.slice(midpoint);

  const firstWaste = firstHalf.reduce((sum, item) => sum + item.wasteTime, 0);
  const secondWaste = secondHalf.reduce((sum, item) => sum + item.wasteTime, 0);

  // Avoid division by zero
  if (firstWaste === 0 && secondWaste === 0) {
    return 'stable';
  }

  // Calculate change ratio
  const total = firstWaste + secondWaste;
  const change = (secondWaste - firstWaste) / (total > 0 ? total : 1);

  // Threshold for determining trend (5% change)
  const threshold = 0.05;

  // Less waste time in second half = improving
  if (change < -threshold) {
    return 'improving';
  } else if (change > threshold) {
    return 'declining';
  }
  return 'stable';
}

// Calculate waste time change percent between current and previous period
function calculateWasteTimeChangePercent(
  currentWasteTime: number,
  previousWasteTime: number
): number | null {
  if (previousWasteTime === 0 && currentWasteTime === 0) {
    return null;
  }
  if (previousWasteTime === 0) {
    // No previous data to compare
    return null;
  }
  return ((currentWasteTime - previousWasteTime) / previousWasteTime) * 100;
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
        blockCount: 0,
        unblockCount: 0
      }
    );
  });

  // Calculate totals
  const totalWasteTime = dailyBreakdown.reduce(
    (sum, day) => sum + day.wasteTime,
    0
  );
  const totalBlockCount = dailyBreakdown.reduce(
    (sum, day) => sum + day.blockCount,
    0
  );
  const totalUnblockCount = dailyBreakdown.reduce(
    (sum, day) => sum + day.unblockCount,
    0
  );

  // Daily block counts for chart
  const dailyBlockCounts = dailyBreakdown.map((d) => d.blockCount);

  // Only return null if there's absolutely no data
  const hasData = totalWasteTime > 0 || totalBlockCount > 0;
  if (!hasData && weekOffset < 0) {
    // For past weeks, return null if no data
    return null;
  }

  // Get top sites
  const topWasteSites = getTopSites(analytics.siteTime, 'waste');
  const topBlockedSites = getTopBlockedSites(analytics.siteBlockCounts);
  const topUnblockedSites = getTopUnblockedSites(
    analytics.siteUnblockCounts || {}
  );

  // Calculate previous week waste time for comparison
  const prevWeekDate = new Date(today);
  prevWeekDate.setDate(today.getDate() + (weekOffset - 1) * 7);
  const prevWeekStart = getWeekStart(prevWeekDate);
  const prevWeekEnd = getWeekEnd(prevWeekDate);
  const prevDates = getDatesInRange(prevWeekStart, prevWeekEnd);

  const prevWasteTime = prevDates.reduce((sum, date) => {
    const stat = analytics.dailyStats[date];
    return sum + (stat ? stat.wasteTime : 0);
  }, 0);

  const wasteTimeChangePercent = calculateWasteTimeChangePercent(
    totalWasteTime,
    prevWasteTime
  );

  // Calculate trend
  const trend = calculateTrend(
    dailyBreakdown.map((d) => ({
      wasteTime: d.wasteTime
    }))
  );

  return {
    weekStart: formatDateKey(weekStart),
    weekEnd: formatDateKey(weekEnd),
    totalWasteTime,
    totalBlockCount,
    totalUnblockCount,
    dailyBreakdown,
    dailyBlockCounts,
    topWasteSites,
    topBlockedSites,
    topUnblockedSites,
    wasteTimeChangePercent,
    trend
  };
}

// Generate monthly report
export function generateMonthlyReport(
  analytics: AnalyticsData,
  monthOffset: number = 0 // 0 = current month, -1 = last month, etc.
): MonthlyReport | null {
  const today = new Date();
  const targetDate = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1
  );

  const monthStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    1
  );
  const monthEnd = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0
  );
  const dates = getDatesInRange(monthStart, monthEnd);

  // Calculate totals
  let totalWasteTime = 0;
  let totalBlockCount = 0;
  let totalUnblockCount = 0;

  dates.forEach((date) => {
    const stat = analytics.dailyStats[date];
    if (stat) {
      totalWasteTime += stat.wasteTime;
      totalBlockCount += stat.blockCount;
      totalUnblockCount += stat.unblockCount || 0;
    }
  });

  // Only return null if there's absolutely no data
  const hasData = totalWasteTime > 0 || totalBlockCount > 0;
  if (!hasData && monthOffset < 0) {
    // For past months, return null if no data
    return null;
  }

  // Generate weekly breakdown
  const weeklyBreakdown: {
    weekStart: string;
    wasteTime: number;
    blockCount: number;
    unblockCount: number;
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
    let weekBlockCount = 0;
    let weekUnblockCount = 0;

    weekDates.forEach((date) => {
      const stat = analytics.dailyStats[date];
      if (stat) {
        weekWaste += stat.wasteTime;
        weekBlockCount += stat.blockCount;
        weekUnblockCount += stat.unblockCount || 0;
      }
    });

    weeklyBreakdown.push({
      weekStart: formatDateKey(currentWeekStart),
      wasteTime: weekWaste,
      blockCount: weekBlockCount,
      unblockCount: weekUnblockCount
    });
  }

  // Get top sites
  const topWasteSites = getTopSites(analytics.siteTime, 'waste');
  const topBlockedSites = getTopBlockedSites(analytics.siteBlockCounts);
  const topUnblockedSites = getTopUnblockedSites(
    analytics.siteUnblockCounts || {}
  );

  // Calculate previous month waste time for comparison
  const prevMonthDate = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset - 1,
    1
  );
  const prevMonthStart = new Date(
    prevMonthDate.getFullYear(),
    prevMonthDate.getMonth(),
    1
  );
  const prevMonthEnd = new Date(
    prevMonthDate.getFullYear(),
    prevMonthDate.getMonth() + 1,
    0
  );
  const prevDates = getDatesInRange(prevMonthStart, prevMonthEnd);

  const prevWasteTime = prevDates.reduce((sum, date) => {
    const stat = analytics.dailyStats[date];
    return sum + (stat ? stat.wasteTime : 0);
  }, 0);

  const wasteTimeChangePercent = calculateWasteTimeChangePercent(
    totalWasteTime,
    prevWasteTime
  );

  // Calculate trend
  const trend = calculateTrend(weeklyBreakdown);

  return {
    month: formatMonthKey(targetDate),
    totalWasteTime,
    totalBlockCount,
    totalUnblockCount,
    weeklyBreakdown,
    topWasteSites,
    topBlockedSites,
    topUnblockedSites,
    wasteTimeChangePercent,
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
