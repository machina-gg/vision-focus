// Format seconds to human readable string (e.g., "1h 23m")
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

// Format seconds to short format (e.g., "1:23:45")
export function formatTimeShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Get today's date in YYYY-MM-DD format
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

// Get date key for a specific date
export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Check if a date string is within the last N days
export function isWithinDays(dateKey: string, days: number): boolean {
  const date = new Date(dateKey)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
  return diffDays <= days
}

// Get dates for the last N days
export function getLastNDays(n: number): string[] {
  const dates: string[] = []
  const today = new Date()

  for (let i = 0; i < n; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(getDateKey(date))
  }

  return dates
}

// Check if current time is within schedule
export function isWithinSchedule(
  startTime: string,
  endTime: string,
  days: number[]
): boolean {
  const now = new Date()
  const currentDay = now.getDay()

  // Check if today is in the schedule days
  if (!days.includes(currentDay)) {
    return false
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  // Handle overnight schedules (e.g., 22:00 - 06:00)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

// Parse time string (HH:mm) to minutes from midnight
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
