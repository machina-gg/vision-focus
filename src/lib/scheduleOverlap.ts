import { normalizeEndTime, parseTimeToMinutes } from '~/lib/time';
import type { Schedule } from '~/types/storage';

const MINUTES_PER_DAY = 24 * 60;

export interface ScheduleTimeSpan {
  startTime: string;
  endTime: string;
  days: number[];
}

interface MinuteRange {
  start: number;
  end: number;
}

// 夜またぎは当日の曜日に属する 2 区間に分ける（isWithinSchedule と同じ意味論）
function toRanges(startTime: string, endTime: string): MinuteRange[] {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(normalizeEndTime(endTime));

  if (end <= start) {
    return [
      { start, end: MINUTES_PER_DAY },
      { start: 0, end }
    ];
  }

  return [{ start, end }];
}

function overlaps(a: MinuteRange, b: MinuteRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function findOverlappingSchedule(
  candidate: ScheduleTimeSpan,
  schedules: Schedule[],
  excludeId?: string
): Schedule | null {
  const candidateRanges = toRanges(candidate.startTime, candidate.endTime);

  const found = schedules.find((schedule) => {
    if (schedule.id === excludeId) return false;

    const sharesDay = schedule.days.some((day) => candidate.days.includes(day));
    if (!sharesDay) return false;

    return toRanges(schedule.startTime, schedule.endTime).some((range) =>
      candidateRanges.some((candidateRange) => overlaps(range, candidateRange))
    );
  });

  return found ?? null;
}
