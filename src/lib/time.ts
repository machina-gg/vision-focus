import { MS_PER_DAY } from '~/constants/intervals';
import { getCurrentLanguage } from '~/lib/i18n';

// Format seconds to human readable string (e.g., "1h 23m")
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

// ローカライズされた時間表記（例: "23分" / "23 min"）
export function formatTimeLocalized(seconds: number): string {
  const language = getCurrentLanguage();

  if (seconds < 60) {
    return language === 'ja' ? `${seconds}秒` : `${seconds} sec`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    if (language === 'ja') {
      return minutes > 0 ? `${hours}時間${minutes}分` : `${hours}時間`;
    } else {
      return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }
  }

  return language === 'ja' ? `${minutes}分` : `${minutes} min`;
}

// Format seconds to short format (e.g., "1:23:45")
export function formatTimeShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Get today's date in YYYY-MM-DD format
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

// Get date key for a specific date
export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Check if a date string is within the last N days
export function isWithinDays(dateKey: string, days: number): boolean {
  const date = new Date(dateKey);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / MS_PER_DAY;
  return diffDays <= days;
}

// Get dates for the last N days
export function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(getDateKey(date));
  }

  return dates;
}

// Validate time string format (HH:mm)
// Accepts 00:00-23:59 and 24:00 (end of day)
export function isValidTimeString(time: string): boolean {
  if (!time || typeof time !== 'string') return false;
  if (time === '24:00') return true;
  const match = time.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  return match !== null;
}

// Parse time string (HH:mm) to minutes from midnight
// Returns 0 if invalid time string
// "24:00" returns 1440 (end of day)
export function parseTimeToMinutes(time: string): number {
  if (!isValidTimeString(time)) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Normalize end time: convert "00:00" to "24:00" for end-of-day semantics
export function normalizeEndTime(endTime: string): string {
  return endTime === '00:00' ? '24:00' : endTime;
}

// Get current hour key in YYYY-MM-DD-HH format
export function getCurrentHourKey(): string {
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const hour = now.getHours().toString().padStart(2, '0');
  return `${dateKey}-${hour}`;
}

// Check if daily reset is needed
export function needsDailyReset(lastDailyReset: string): boolean {
  return lastDailyReset !== getTodayKey();
}

// Check if hourly reset is needed
export function needsHourlyReset(lastHourlyReset: string): boolean {
  return lastHourlyReset !== getCurrentHourKey();
}

// Check if current time is within schedule
export function isWithinSchedule(
  startTime: string,
  endTime: string,
  days: number[]
): boolean {
  const normalizedEndTime = normalizeEndTime(endTime);

  // Validate inputs
  if (!isValidTimeString(startTime) || !isValidTimeString(normalizedEndTime)) {
    return false;
  }
  if (!Array.isArray(days) || days.length === 0) {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay();

  // Check if today is in the schedule days
  if (!days.includes(currentDay)) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(normalizedEndTime);

  // Handle overnight schedules (e.g., 22:00 - 06:00)
  if (endMinutes <= startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
