import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WeeklyCalendar } from '../WeeklyCalendar';
import type { Schedule, VisionSettings } from '~/types/storage';
import { DEFAULT_DISPLAY_SETTINGS, DEFAULT_VISION } from '~/types/storage';

/**
 * WeeklyCalendar の表示分岐とコールバックの検査
 *
 * スケジュールが 0 件のときに何も描画しないこと、指定した曜日にだけ
 * ブロックが出ること、終了時刻 "00:00"（＝翌 0 時）が 1 日の終わりとして
 * 扱われることを確かめる。スタイル（プリセット）名は vision 側にしか無いため、
 * vision が未取得・参照先が消えている経路も含める。
 */

// 「今日」の列と現在時刻の線は実行時の日時で変わるため、基準時刻を固定する。
// ローカル時刻で組み立てて、タイムゾーンによらず 2026-03-01（日）12:00 にする
const NOW = new Date(2026, 2, 1, 12, 0, 0);
const SUNDAY_INDEX = 0;

const scheduleOf = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'schedule-1',
  name: '朝の集中',
  startTime: '09:00',
  endTime: '12:00',
  days: [SUNDAY_INDEX],
  enabled: true,
  ...overrides
});

const visionWithPreset = (id: string, name: string): VisionSettings => ({
  ...DEFAULT_VISION,
  presets: [
    {
      ...DEFAULT_DISPLAY_SETTINGS,
      id,
      name,
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ]
});

/**
 * ブロックの title 属性は改行区切りだが、getByTitle は空白を詰めてから
 * 比較する（Testing Library の既定の正規化）。検索語も同じ形で組み立てる
 */
const blockTitle = (...lines: string[]): string => lines.join(' ');

function renderCalendar(
  schedules: Schedule[],
  vision: VisionSettings | undefined = undefined
) {
  const onScheduleClick = vi.fn();
  const result = render(
    <WeeklyCalendar
      schedules={schedules}
      vision={vision}
      onScheduleClick={onScheduleClick}
    />
  );
  return { onScheduleClick, ...result };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WeeklyCalendar', () => {
  describe('スケジュールが 0 件のとき', () => {
    it('カレンダーそのものを描画しない', () => {
      const { container } = renderCalendar([]);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('枠組み', () => {
    it('見出しと 7 日分の曜日ヘッダを出す', () => {
      renderCalendar([scheduleOf()]);

      expect(screen.getByText('weeklyCalendar')).toBeInTheDocument();
      expect(screen.getByTestId('weekly-calendar')).toBeInTheDocument();
      expect(screen.getAllByTestId('weekly-calendar-day-header')).toHaveLength(
        7
      );
    });

    it('今日の曜日ヘッダだけを強調する', () => {
      renderCalendar([scheduleOf()]);

      // 強調は色でしか表せないため、今日の列に付く装飾クラスで判別する
      const headers = screen.getAllByTestId('weekly-calendar-day-header');
      expect(headers[SUNDAY_INDEX].className).toContain('bg-danger-50');
      expect(headers[SUNDAY_INDEX + 1].className).not.toContain('bg-danger-50');
    });
  });

  describe('スケジュールのブロック', () => {
    it('指定した曜日の数だけブロックを出す', () => {
      renderCalendar([scheduleOf({ days: [1, 3, 5] })]);

      expect(
        screen.getAllByTitle(blockTitle('朝の集中', '09:00 - 12:00'))
      ).toHaveLength(3);
    });

    it('曜日が 0 件ならブロックを出さない（凡例だけが残る）', () => {
      renderCalendar([scheduleOf({ days: [] })]);

      expect(
        screen.queryByTitle(blockTitle('朝の集中', '09:00 - 12:00'))
      ).toBeNull();
      expect(screen.getByText('朝の集中')).toBeInTheDocument();
    });

    it('開始・終了時刻から高さを決める', () => {
      renderCalendar([
        scheduleOf({ startTime: '00:00', endTime: '12:00', days: [0] })
      ]);

      const block = screen.getByTitle(blockTitle('朝の集中', '00:00 - 12:00'));
      expect(block).toHaveStyle({ top: '0%', height: '50%' });
    });

    it('終了時刻 "00:00" は 1 日の終わりとして扱う', () => {
      renderCalendar([
        scheduleOf({ startTime: '00:00', endTime: '00:00', days: [0] })
      ]);

      const block = screen.getByTitle(blockTitle('朝の集中', '00:00 - 00:00'));
      expect(block).toHaveStyle({ height: '100%' });
    });

    it('押すとそのスケジュールが onScheduleClick に渡る', () => {
      const schedule = scheduleOf({ id: 'schedule-9', days: [0] });
      const { onScheduleClick } = renderCalendar([schedule]);

      fireEvent.click(
        screen.getByTitle(blockTitle('朝の集中', '09:00 - 12:00'))
      );

      expect(onScheduleClick).toHaveBeenCalledWith(schedule);
    });
  });

  describe('スタイル（プリセット）名', () => {
    it('presetId に対応するスタイルがあれば名前を併記する', () => {
      renderCalendar(
        [scheduleOf({ presetId: 'preset-1' })],
        visionWithPreset('preset-1', '集中モード')
      );

      expect(
        screen.getByTitle(
          blockTitle('朝の集中', '09:00 - 12:00', 'presetLabel: 集中モード')
        )
      ).toBeInTheDocument();
      expect(screen.getByText('集中モード')).toBeInTheDocument();
    });

    it('presetId が未設定なら名前を併記しない', () => {
      renderCalendar(
        [scheduleOf()],
        visionWithPreset('preset-1', '集中モード')
      );

      expect(
        screen.getByTitle(blockTitle('朝の集中', '09:00 - 12:00'))
      ).toBeInTheDocument();
      expect(screen.queryByText('集中モード')).not.toBeInTheDocument();
    });

    it('参照先のスタイルが消えていても名前を併記しない', () => {
      renderCalendar(
        [scheduleOf({ presetId: 'removed' })],
        visionWithPreset('preset-1', '集中モード')
      );

      expect(
        screen.getByTitle(blockTitle('朝の集中', '09:00 - 12:00'))
      ).toBeInTheDocument();
    });

    it('vision が未取得でも名前を併記せずに描画する', () => {
      renderCalendar([scheduleOf({ presetId: 'preset-1' })], undefined);

      expect(
        screen.getByTitle(blockTitle('朝の集中', '09:00 - 12:00'))
      ).toBeInTheDocument();
    });
  });

  describe('凡例', () => {
    it('スケジュールの名前をすべて並べる', () => {
      renderCalendar([
        scheduleOf({ id: 's1', name: '朝の集中', days: [] }),
        scheduleOf({ id: 's2', name: '夜の集中', days: [] })
      ]);

      expect(screen.getByText('朝の集中')).toBeInTheDocument();
      expect(screen.getByText('夜の集中')).toBeInTheDocument();
    });

    it('名前が空文字でも凡例の枠は残す', () => {
      const { container } = renderCalendar([
        scheduleOf({ name: '', days: [] })
      ]);

      // 凡例は Card 直下の最後のブロックに並ぶ
      const legend = container.querySelector('.mt-4.flex.flex-wrap');
      expect(legend?.children).toHaveLength(1);
    });

    it('無効なスケジュールは取り消し線つきで示す', () => {
      renderCalendar([scheduleOf({ enabled: false, days: [] })]);

      // 有効・無効の差は装飾でしか表せないため、取り消し線のクラスで判別する
      expect(screen.getByText('朝の集中').className).toContain('line-through');
    });

    it('有効なスケジュールには取り消し線を付けない', () => {
      renderCalendar([scheduleOf({ enabled: true, days: [] })]);

      expect(screen.getByText('朝の集中').className).not.toContain(
        'line-through'
      );
    });
  });
});
