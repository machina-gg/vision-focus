import { MS_PER_DAY } from '~/constants/intervals';
import { getUILanguage } from '~/lib/i18n';
import type { DateKey } from '~/types/activity';

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

export function formatTimeLocalized(seconds: number): string {
  const language = getUILanguage();

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

export function formatTimeShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

// toISOString は UTC の日付になり、UTC より東のタイムゾーンでは前日にずれるため、ローカルの年月日から組み立てる
export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isWithinDays(dateKey: string, days: number): boolean {
  const date = new Date(dateKey);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / MS_PER_DAY;
  return diffDays <= days;
}

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

export function isValidTimeString(time: string): boolean {
  if (!time || typeof time !== 'string') return false;
  if (time === '24:00') return true;
  const match = time.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  return match !== null;
}

export function parseTimeToMinutes(time: string): number {
  if (!isValidTimeString(time)) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function normalizeEndTime(endTime: string): string {
  return endTime === '00:00' ? '24:00' : endTime;
}

export function isWithinSchedule(
  startTime: string,
  endTime: string,
  days: number[]
): boolean {
  const normalizedEndTime = normalizeEndTime(endTime);

  if (!isValidTimeString(startTime) || !isValidTimeString(normalizedEndTime)) {
    return false;
  }
  if (!Array.isArray(days) || days.length === 0) {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay();

  if (!days.includes(currentDay)) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(normalizedEndTime);

  if (endMinutes <= startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
