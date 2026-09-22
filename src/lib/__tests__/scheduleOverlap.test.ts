import { describe, it, expect } from 'vitest';

import {
  findOverlappingSchedule,
  type ScheduleTimeSpan
} from '~/lib/scheduleOverlap';
import type { Schedule } from '~/types/storage';

function makeSchedule(
  id: string,
  startTime: string,
  endTime: string,
  days: number[],
  enabled = true
): Schedule {
  return { id, name: id, startTime, endTime, days, enabled };
}

const candidate = (
  startTime: string,
  endTime: string,
  days: number[]
): ScheduleTimeSpan => ({ startTime, endTime, days });

describe('findOverlappingSchedule', () => {
  it('同じ曜日で時間帯が交差するものを返す', () => {
    const existing = makeSchedule('a', '09:00', '12:00', [1]);

    expect(
      findOverlappingSchedule(candidate('10:00', '13:00', [1]), [existing])
    ).toBe(existing);
  });

  it('完全に同じ時間帯でも重複とみなす', () => {
    const existing = makeSchedule('a', '09:00', '12:00', [1, 3]);

    expect(
      findOverlappingSchedule(candidate('09:00', '12:00', [3]), [existing])
    ).toBe(existing);
  });

  it('片方が他方を内包する場合も重複とみなす', () => {
    const existing = makeSchedule('a', '09:00', '18:00', [2]);

    expect(
      findOverlappingSchedule(candidate('10:00', '11:00', [2]), [existing])
    ).toBe(existing);
  });

  it('端が接するだけなら重複としない', () => {
    const existing = makeSchedule('a', '09:00', '12:00', [1]);

    expect(
      findOverlappingSchedule(candidate('12:00', '13:00', [1]), [existing])
    ).toBeNull();
    expect(
      findOverlappingSchedule(candidate('07:00', '09:00', [1]), [existing])
    ).toBeNull();
  });

  it('曜日を 1 つも共有しなければ重複としない', () => {
    const existing = makeSchedule('a', '09:00', '12:00', [1, 2]);

    expect(
      findOverlappingSchedule(candidate('09:00', '12:00', [3, 4]), [existing])
    ).toBeNull();
  });

  it('曜日を 1 つでも共有していれば重複とみなす', () => {
    const existing = makeSchedule('a', '09:00', '12:00', [1, 2]);

    expect(
      findOverlappingSchedule(candidate('09:00', '12:00', [2, 5]), [existing])
    ).toBe(existing);
  });

  it('候補の曜日が空なら重複としない', () => {
    const existing = makeSchedule('a', '09:00', '12:00', [1]);

    expect(
      findOverlappingSchedule(candidate('09:00', '12:00', []), [existing])
    ).toBeNull();
  });

  describe('夜またぎ', () => {
    it('夜またぎ同士が朝側で交差する', () => {
      const existing = makeSchedule('a', '22:00', '06:00', [1]);

      expect(
        findOverlappingSchedule(candidate('23:00', '05:00', [1]), [existing])
      ).toBe(existing);
    });

    it('夜またぎと通常が朝側（00:00 以降）で交差する', () => {
      const existing = makeSchedule('a', '22:00', '06:00', [1]);

      expect(
        findOverlappingSchedule(candidate('05:00', '08:00', [1]), [existing])
      ).toBe(existing);
    });

    it('夜またぎと通常が夜側（24:00 まで）で交差する', () => {
      const existing = makeSchedule('a', '22:00', '06:00', [1]);

      expect(
        findOverlappingSchedule(candidate('21:00', '23:00', [1]), [existing])
      ).toBe(existing);
    });

    it('夜またぎの空き時間帯とは重複としない', () => {
      const existing = makeSchedule('a', '22:00', '06:00', [1]);

      expect(
        findOverlappingSchedule(candidate('06:00', '22:00', [1]), [existing])
      ).toBeNull();
    });

    it('夜またぎでも曜日が違えば重複としない（翌日側へは持ち越さない）', () => {
      const existing = makeSchedule('a', '22:00', '06:00', [1]);

      expect(
        findOverlappingSchedule(candidate('00:00', '05:00', [2]), [existing])
      ).toBeNull();
    });

    it('終了が 00:00 の場合は 24:00 として扱い、夜またぎにしない', () => {
      const existing = makeSchedule('a', '22:00', '00:00', [1]);

      expect(
        findOverlappingSchedule(candidate('00:00', '06:00', [1]), [existing])
      ).toBeNull();
      expect(
        findOverlappingSchedule(candidate('23:00', '00:00', [1]), [existing])
      ).toBe(existing);
    });

    it('開始と終了が同じなら終日として扱う', () => {
      const existing = makeSchedule('a', '09:00', '09:00', [1]);

      expect(
        findOverlappingSchedule(candidate('03:00', '04:00', [1]), [existing])
      ).toBe(existing);
    });
  });

  it('無効なスケジュールとも重複とみなす', () => {
    const existing = makeSchedule('a', '09:00', '12:00', [1], false);

    expect(
      findOverlappingSchedule(candidate('10:00', '11:00', [1]), [existing])
    ).toBe(existing);
  });

  it('excludeId で指定したスケジュールは除く', () => {
    const existing = makeSchedule('a', '09:00', '12:00', [1]);

    expect(
      findOverlappingSchedule(candidate('09:00', '12:00', [1]), [existing], 'a')
    ).toBeNull();
  });

  it('excludeId 以外に重なるものがあればそれを返す', () => {
    const self = makeSchedule('a', '09:00', '12:00', [1]);
    const other = makeSchedule('b', '11:00', '13:00', [1]);

    expect(
      findOverlappingSchedule(
        candidate('09:00', '12:00', [1]),
        [self, other],
        'a'
      )
    ).toBe(other);
  });

  it('スケジュールが 0 件なら null を返す', () => {
    expect(findOverlappingSchedule(candidate('09:00', '12:00', [1]), [])).toBe(
      null
    );
  });
});
