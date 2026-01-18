/**
 * Report generation utilities for weekly and monthly reports
 */

import type {
  AnalyticsData,
  DailyStat,
  SiteTime,
  WeeklyReport,
  MonthlyReport,
} from '~/types/storage'

/**
 * Get the start of the week (Sunday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the end of the week (Saturday) for a given date
 */
function getWeekEnd(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (6 - day))
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get top sites by time
 */
function getTopSites(
  siteTime: Record<string, SiteTime>,
  category: 'waste' | 'invest',
  limit: number = 5
): { domain: string; time: number }[] {
  return Object.values(siteTime)
    .filter((site) => site.category === category)
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)
    .map((site) => ({ domain: site.domain, time: site.time }))
}

/**
 * Calculate trend based on comparing first half vs second half of period
 */
function calculateTrend(
  dailyStats: DailyStat[]
): 'improving' | 'declining' | 'stable' {
  if (dailyStats.length < 2) return 'stable'

  const midpoint = Math.floor(dailyStats.length / 2)
  const firstHalf = dailyStats.slice(0, midpoint)
  const secondHalf = dailyStats.slice(midpoint)

  const firstHalfWaste = firstHalf.reduce((sum, d) => sum + d.wasteTime, 0)
  const secondHalfWaste = secondHalf.reduce((sum, d) => sum + d.wasteTime, 0)

  const firstHalfInvest = firstHalf.reduce((sum, d) => sum + d.investTime, 0)
  const secondHalfInvest = secondHalf.reduce((sum, d) => sum + d.investTime, 0)

  // Calculate productivity ratio (invest / waste)
  const firstRatio =
    firstHalfWaste > 0 ? firstHalfInvest / firstHalfWaste : firstHalfInvest
  const secondRatio =
    secondHalfWaste > 0 ? secondHalfInvest / secondHalfWaste : secondHalfInvest

  const change = secondRatio - firstRatio
  const threshold = 0.1 // 10% change threshold

  if (change > threshold) return 'improving'
  if (change < -threshold) return 'declining'
  return 'stable'
}

/**
 * Generate a weekly report
 */
export function generateWeeklyReport(
  analytics: AnalyticsData,
  weekStartDate?: Date
): WeeklyReport {
  const now = weekStartDate || new Date()
  const weekStart = getWeekStart(now)
  const weekEnd = getWeekEnd(now)

  const dailyBreakdown: DailyStat[] = []
  let totalWasteTime = 0
  let totalInvestTime = 0
  let totalBlockCount = 0

  // Collect stats for each day of the week
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(weekStart)
    currentDate.setDate(weekStart.getDate() + i)
    const dateKey = formatDate(currentDate)

    const dayStat = analytics.dailyStats[dateKey] || {
      date: dateKey,
      wasteTime: 0,
      investTime: 0,
      blockCount: 0,
    }

    dailyBreakdown.push(dayStat)
    totalWasteTime += dayStat.wasteTime
    totalInvestTime += dayStat.investTime
    totalBlockCount += dayStat.blockCount
  }

  return {
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
    totalWasteTime,
    totalInvestTime,
    totalBlockCount,
    dailyBreakdown,
    topWasteSites: getTopSites(analytics.siteTime, 'waste'),
    topInvestSites: getTopSites(analytics.siteTime, 'invest'),
    trend: calculateTrend(dailyBreakdown),
  }
}

/**
 * Generate a monthly report
 */
export function generateMonthlyReport(
  analytics: AnalyticsData,
  month?: string // YYYY-MM format
): MonthlyReport {
  const now = new Date()
  const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [year, monthNum] = targetMonth.split('-').map(Number)
  const firstDay = new Date(year, monthNum - 1, 1)
  const lastDay = new Date(year, monthNum, 0)

  let totalWasteTime = 0
  let totalInvestTime = 0
  let totalBlockCount = 0

  const weeklyBreakdown: {
    weekStart: string
    wasteTime: number
    investTime: number
  }[] = []

  // Group by weeks
  let currentWeekStart = getWeekStart(firstDay)
  while (currentWeekStart <= lastDay) {
    const weekEnd = getWeekEnd(currentWeekStart)
    let weekWaste = 0
    let weekInvest = 0

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(currentWeekStart)
      currentDate.setDate(currentWeekStart.getDate() + i)

      // Skip if outside the target month
      if (currentDate < firstDay || currentDate > lastDay) continue

      const dateKey = formatDate(currentDate)
      const dayStat = analytics.dailyStats[dateKey]

      if (dayStat) {
        weekWaste += dayStat.wasteTime
        weekInvest += dayStat.investTime
        totalBlockCount += dayStat.blockCount
      }
    }

    weeklyBreakdown.push({
      weekStart: formatDate(currentWeekStart),
      wasteTime: weekWaste,
      investTime: weekInvest,
    })

    totalWasteTime += weekWaste
    totalInvestTime += weekInvest

    // Move to next week
    currentWeekStart = new Date(currentWeekStart)
    currentWeekStart.setDate(currentWeekStart.getDate() + 7)
  }

  // Get all daily stats for trend calculation
  const dailyStats: DailyStat[] = []
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateKey = formatDate(d)
    if (analytics.dailyStats[dateKey]) {
      dailyStats.push(analytics.dailyStats[dateKey])
    }
  }

  return {
    month: targetMonth,
    totalWasteTime,
    totalInvestTime,
    totalBlockCount,
    weeklyBreakdown,
    topWasteSites: getTopSites(analytics.siteTime, 'waste'),
    topInvestSites: getTopSites(analytics.siteTime, 'invest'),
    trend: calculateTrend(dailyStats),
  }
}

/**
 * Format seconds to human readable time
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

/**
 * Get trend emoji
 */
export function getTrendEmoji(trend: 'improving' | 'declining' | 'stable'): string {
  switch (trend) {
    case 'improving':
      return '↑'
    case 'declining':
      return '↓'
    case 'stable':
      return '→'
  }
}

/**
 * Get available months from analytics data
 */
export function getAvailableMonths(analytics: AnalyticsData): string[] {
  const months = new Set<string>()

  Object.keys(analytics.dailyStats).forEach((dateKey) => {
    const month = dateKey.substring(0, 7) // YYYY-MM
    months.add(month)
  })

  return Array.from(months).sort().reverse()
}

/**
 * Get available weeks from analytics data
 */
export function getAvailableWeeks(
  analytics: AnalyticsData
): { start: string; end: string }[] {
  const weeks = new Map<string, { start: Date; end: Date }>()

  Object.keys(analytics.dailyStats).forEach((dateKey) => {
    const date = new Date(dateKey)
    const weekStart = getWeekStart(date)
    const weekEnd = getWeekEnd(date)
    const key = formatDate(weekStart)

    if (!weeks.has(key)) {
      weeks.set(key, { start: weekStart, end: weekEnd })
    }
  })

  return Array.from(weeks.values())
    .sort((a, b) => b.start.getTime() - a.start.getTime())
    .map((w) => ({ start: formatDate(w.start), end: formatDate(w.end) }))
}
