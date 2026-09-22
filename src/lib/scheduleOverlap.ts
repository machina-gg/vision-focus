import { normalizeEndTime, parseTimeToMinutes } from '~/lib/time';
import type { Schedule } from '~/types/storage';

const MINUTES_PER_DAY = 24 * 60;

/** 重複を調べる対象。保存前のフォームも渡せるよう id と enabled は持たない */
export interface ScheduleTimeSpan {
  startTime: string;
  endTime: string;
  days: number[];
}

interface MinuteRange {
  start: number;
  end: number;
}

// 当日の曜日の中で占める区間に分ける。
// 夜またぎ（終了が開始以下）は「start〜24:00」と「00:00〜end」の 2 区間になり、
// どちらも当日の曜日に属する（isWithinSchedule と同じ意味論）
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

// 端が接するだけ（09:00〜12:00 と 12:00〜13:00）は重複としないため、開区間で比べる
function overlaps(a: MinuteRange, b: MinuteRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * 時間帯が重なる既存のスケジュールを返す（無ければ null）。
 *
 * 曜日を 1 つでも共有し、その曜日の中で時間帯が交差するものを重複とみなす。
 * 無効なスケジュールも対象に含める（後から有効化した瞬間に重複が生まれるため）。
 *
 * @param excludeId 編集中のスケジュール自身を除くための id
 */
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
