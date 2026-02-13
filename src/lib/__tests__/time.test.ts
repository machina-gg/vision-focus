import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatTime,
  formatTimeLocalized,
  formatTimeShort,
  getTodayKey,
  getDateKey,
  isWithinDays,
  getLastNDays,
  isValidTimeString,
  parseTimeToMinutes,
  normalizeEndTime,
  getCurrentHourKey,
  needsDailyReset,
  needsHourlyReset,
  isWithinSchedule
} from '~/lib/time';
import * as i18n from '~/lib/i18n';

describe('formatTime', () => {
  it('formats seconds less than 60', () => {
    expect(formatTime(30)).toBe('30s');
    expect(formatTime(0)).toBe('0s');
    expect(formatTime(59)).toBe('59s');
  });

  it('formats minutes only (no hours)', () => {
    expect(formatTime(60)).toBe('1m');
    expect(formatTime(120)).toBe('2m');
    expect(formatTime(3540)).toBe('59m'); // 59 minutes
  });

  it('formats hours and minutes', () => {
    expect(formatTime(3600)).toBe('1h 0m');
    expect(formatTime(3660)).toBe('1h 1m');
    expect(formatTime(7380)).toBe('2h 3m');
  });

  it('handles large values', () => {
    expect(formatTime(86400)).toBe('24h 0m'); // 1 day
    expect(formatTime(90061)).toBe('25h 1m'); // More than 1 day
  });
});

describe('formatTimeLocalized', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('formats seconds in English', () => {
    vi.spyOn(i18n, 'getCurrentLanguage').mockReturnValue('en');
    expect(formatTimeLocalized(30)).toBe('30 sec');
  });

  it('formats seconds in Japanese', () => {
    vi.spyOn(i18n, 'getCurrentLanguage').mockReturnValue('ja');
    expect(formatTimeLocalized(30)).toBe('30秒');
  });

  it('formats minutes only in English', () => {
    vi.spyOn(i18n, 'getCurrentLanguage').mockReturnValue('en');
    expect(formatTimeLocalized(120)).toBe('2 min');
  });

  it('formats minutes only in Japanese', () => {
    vi.spyOn(i18n, 'getCurrentLanguage').mockReturnValue('ja');
    expect(formatTimeLocalized(120)).toBe('2分');
  });

  it('formats hours and minutes in English', () => {
    vi.spyOn(i18n, 'getCurrentLanguage').mockReturnValue('en');
    expect(formatTimeLocalized(3660)).toBe('1 hr 1 min');
  });

  it('formats hours and minutes in Japanese', () => {
    vi.spyOn(i18n, 'getCurrentLanguage').mockReturnValue('ja');
    expect(formatTimeLocalized(3660)).toBe('1時間1分');
  });

  it('formats hours only in English', () => {
    vi.spyOn(i18n, 'getCurrentLanguage').mockReturnValue('en');
    expect(formatTimeLocalized(3600)).toBe('1 hr');
  });

  it('formats hours only in Japanese', () => {
    vi.spyOn(i18n, 'getCurrentLanguage').mockReturnValue('ja');
    expect(formatTimeLocalized(3600)).toBe('1時間');
  });
});

describe('formatTimeShort', () => {
  it('formats seconds only (no hours)', () => {
    expect(formatTimeShort(30)).toBe('0:30');
    expect(formatTimeShort(59)).toBe('0:59');
  });

  it('formats minutes and seconds (no hours)', () => {
    expect(formatTimeShort(90)).toBe('1:30');
    expect(formatTimeShort(3599)).toBe('59:59');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTimeShort(3600)).toBe('1:00:00');
    expect(formatTimeShort(3661)).toBe('1:01:01');
    expect(formatTimeShort(86399)).toBe('23:59:59');
  });

  it('pads single-digit values with zeros', () => {
    expect(formatTimeShort(3605)).toBe('1:00:05');
    expect(formatTimeShort(3665)).toBe('1:01:05');
  });
});

describe('getTodayKey', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const key = getTodayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns consistent key for same day', () => {
    const key1 = getTodayKey();
    const key2 = getTodayKey();
    expect(key1).toBe(key2);
  });
});

describe('getDateKey', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const date = new Date('2024-03-15T12:30:00Z');
    expect(getDateKey(date)).toBe('2024-03-15');
  });

  it('handles different dates', () => {
    const date1 = new Date('2024-01-01T00:00:00Z');
    const date2 = new Date('2024-12-31T23:59:59Z');
    expect(getDateKey(date1)).toBe('2024-01-01');
    expect(getDateKey(date2)).toBe('2024-12-31');
  });

  it('ignores time component', () => {
    const morning = new Date('2024-03-15T08:00:00Z');
    const evening = new Date('2024-03-15T20:00:00Z');
    expect(getDateKey(morning)).toBe(getDateKey(evening));
  });
});

describe('isWithinDays', () => {
  it('returns true for today within 1 day', () => {
    const today = getTodayKey();
    // Today is always within 1 day (fractional day < 1)
    expect(isWithinDays(today, 1)).toBe(true);
  });

  it('returns true for date within range', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = getDateKey(yesterday);
    // Yesterday is within 1-2 days depending on time
    expect(isWithinDays(key, 2)).toBe(true);
    expect(isWithinDays(key, 7)).toBe(true);
  });

  it('returns false for date outside range', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    const key = getDateKey(oldDate);
    expect(isWithinDays(key, 7)).toBe(false);
  });

  it('handles date well within range', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const key = getDateKey(threeDaysAgo);
    expect(isWithinDays(key, 7)).toBe(true);
  });

  it('returns false for date exactly outside range', () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    const key = getDateKey(eightDaysAgo);
    expect(isWithinDays(key, 7)).toBe(false);
  });
});

describe('getLastNDays', () => {
  it('returns correct number of dates', () => {
    const days = getLastNDays(7);
    expect(days).toHaveLength(7);
  });

  it('includes today as first element', () => {
    const days = getLastNDays(5);
    expect(days[0]).toBe(getTodayKey());
  });

  it('returns dates in descending order', () => {
    const days = getLastNDays(3);
    const today = new Date(days[0]);
    const yesterday = new Date(days[1]);
    const twoDaysAgo = new Date(days[2]);
    expect(today > yesterday).toBe(true);
    expect(yesterday > twoDaysAgo).toBe(true);
  });

  it('handles single day', () => {
    const days = getLastNDays(1);
    expect(days).toHaveLength(1);
    expect(days[0]).toBe(getTodayKey());
  });

  it('returns dates in YYYY-MM-DD format', () => {
    const days = getLastNDays(5);
    days.forEach((day) => {
      expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('isValidTimeString', () => {
  it('validates standard time format', () => {
    expect(isValidTimeString('00:00')).toBe(true);
    expect(isValidTimeString('12:30')).toBe(true);
    expect(isValidTimeString('23:59')).toBe(true);
  });

  it('accepts 24:00 as end-of-day marker', () => {
    expect(isValidTimeString('24:00')).toBe(true);
  });

  it('rejects invalid hours', () => {
    expect(isValidTimeString('24:01')).toBe(false);
    expect(isValidTimeString('25:00')).toBe(false);
  });

  it('rejects invalid minutes', () => {
    expect(isValidTimeString('12:60')).toBe(false);
    expect(isValidTimeString('12:99')).toBe(false);
  });

  it('rejects malformed strings', () => {
    expect(isValidTimeString('12:3')).toBe(false); // Single-digit minute
    expect(isValidTimeString('12-30')).toBe(false); // Wrong separator
    expect(isValidTimeString('1230')).toBe(false); // No separator
  });

  it('rejects non-string inputs', () => {
    expect(isValidTimeString('')).toBe(false);
    expect(isValidTimeString(null as any)).toBe(false);
    expect(isValidTimeString(undefined as any)).toBe(false);
  });

  it('accepts single-digit hours with leading zero', () => {
    expect(isValidTimeString('09:30')).toBe(true);
    expect(isValidTimeString('01:00')).toBe(true);
  });
});

describe('parseTimeToMinutes', () => {
  it('parses midnight', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
  });

  it('parses standard times', () => {
    expect(parseTimeToMinutes('01:00')).toBe(60);
    expect(parseTimeToMinutes('12:30')).toBe(750);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('parses end-of-day marker', () => {
    expect(parseTimeToMinutes('24:00')).toBe(1440);
  });

  it('returns 0 for invalid input', () => {
    expect(parseTimeToMinutes('invalid')).toBe(0);
    expect(parseTimeToMinutes('25:00')).toBe(0);
    expect(parseTimeToMinutes('')).toBe(0);
  });
});

describe('normalizeEndTime', () => {
  it('converts 00:00 to 24:00', () => {
    expect(normalizeEndTime('00:00')).toBe('24:00');
  });

  it('leaves other times unchanged', () => {
    expect(normalizeEndTime('12:30')).toBe('12:30');
    expect(normalizeEndTime('23:59')).toBe('23:59');
    expect(normalizeEndTime('24:00')).toBe('24:00');
  });
});

describe('getCurrentHourKey', () => {
  it('returns key in YYYY-MM-DD-HH format', () => {
    const key = getCurrentHourKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}$/);
  });

  it('pads single-digit hours', () => {
    const key = getCurrentHourKey();
    const hour = key.split('-')[3];
    expect(hour).toHaveLength(2);
  });
});

describe('needsDailyReset', () => {
  it('returns true when dates differ', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastReset = getDateKey(yesterday);
    expect(needsDailyReset(lastReset)).toBe(true);
  });

  it('returns false when dates match', () => {
    const today = getTodayKey();
    expect(needsDailyReset(today)).toBe(false);
  });
});

describe('needsHourlyReset', () => {
  it('returns false for current hour', () => {
    const currentHour = getCurrentHourKey();
    expect(needsHourlyReset(currentHour)).toBe(false);
  });

  it('returns true for different hour', () => {
    expect(needsHourlyReset('2024-01-01-12')).toBe(true);
  });
});

describe('isWithinSchedule', () => {
  // Helper to create test date at specific day/time
  const mockDate = (dayOfWeek: number, hours: number, minutes: number) => {
    const date = new Date();
    const currentDay = date.getDay();
    const diff = dayOfWeek - currentDay;
    date.setDate(date.getDate() + diff);
    date.setHours(hours, minutes, 0, 0);
    vi.setSystemTime(date);
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when time is within schedule', () => {
    mockDate(1, 10, 0); // Monday 10:00
    expect(isWithinSchedule('09:00', '17:00', [1])).toBe(true);
  });

  it('returns false when time is before schedule', () => {
    mockDate(1, 8, 0); // Monday 08:00
    expect(isWithinSchedule('09:00', '17:00', [1])).toBe(false);
  });

  it('returns false when time is after schedule', () => {
    mockDate(1, 18, 0); // Monday 18:00
    expect(isWithinSchedule('09:00', '17:00', [1])).toBe(false);
  });

  it('returns false when day is not in schedule', () => {
    mockDate(2, 10, 0); // Tuesday 10:00
    expect(isWithinSchedule('09:00', '17:00', [1])).toBe(false); // Only Monday
  });

  it('returns true for multiple scheduled days', () => {
    mockDate(3, 10, 0); // Wednesday 10:00
    expect(isWithinSchedule('09:00', '17:00', [1, 2, 3])).toBe(true);
  });

  it('handles overnight schedules (22:00 - 06:00)', () => {
    mockDate(1, 23, 0); // Monday 23:00
    expect(isWithinSchedule('22:00', '06:00', [1])).toBe(true);

    mockDate(1, 5, 0); // Monday 05:00
    expect(isWithinSchedule('22:00', '06:00', [1])).toBe(true);

    mockDate(1, 12, 0); // Monday 12:00
    expect(isWithinSchedule('22:00', '06:00', [1])).toBe(false);
  });

  it('handles end time 24:00', () => {
    mockDate(1, 23, 59); // Monday 23:59
    expect(isWithinSchedule('00:00', '24:00', [1])).toBe(true);
  });

  it('handles start time at exact boundary', () => {
    mockDate(1, 9, 0); // Monday 09:00
    expect(isWithinSchedule('09:00', '17:00', [1])).toBe(true);
  });

  it('handles end time at exact boundary (exclusive)', () => {
    mockDate(1, 17, 0); // Monday 17:00
    expect(isWithinSchedule('09:00', '17:00', [1])).toBe(false);
  });

  it('returns false for invalid time strings', () => {
    mockDate(1, 10, 0); // Monday 10:00
    expect(isWithinSchedule('invalid', '17:00', [1])).toBe(false);
    expect(isWithinSchedule('09:00', 'invalid', [1])).toBe(false);
  });

  it('returns false for empty days array', () => {
    mockDate(1, 10, 0); // Monday 10:00
    expect(isWithinSchedule('09:00', '17:00', [])).toBe(false);
  });

  it('handles Sunday (day 0)', () => {
    mockDate(0, 10, 0); // Sunday 10:00
    expect(isWithinSchedule('09:00', '17:00', [0])).toBe(true);
  });

  it('handles Saturday (day 6)', () => {
    mockDate(6, 10, 0); // Saturday 10:00
    expect(isWithinSchedule('09:00', '17:00', [6])).toBe(true);
  });

  it('normalizes 00:00 end time to 24:00', () => {
    mockDate(1, 23, 59); // Monday 23:59
    expect(isWithinSchedule('00:00', '00:00', [1])).toBe(true);
  });
});
