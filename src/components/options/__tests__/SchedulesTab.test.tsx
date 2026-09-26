import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SchedulesTab } from '../SchedulesTab';
import type { AppSettings, Schedule } from '~/types/storage';
import type { DashboardPreset, VisionSettings } from '~/types/vision';
import { DEFAULT_DISPLAY_SETTINGS, DEFAULT_VISION } from '~/types/vision';

/**
 * SchedulesTab の一覧の出し分けと、操作で渡る引数の検査
 *
 * 設定は SettingsContext から来るため Context ごと差し替える
 * （実体は chrome.storage を読みに行き、テストから値を決められない）。
 * 週表示のカレンダーは別コンポーネントの責務なので、受け取った props だけ見る。
 *
 * 有効な曜日は背景色の差でしか出ていなかったため data-active を足してから
 * 検査する（COMPONENT_TESTING.md「状態は属性で表す」）。
 */

const settingsState = vi.hoisted(() => ({
  settings: undefined as AppSettings | undefined,
  vision: undefined as VisionSettings | undefined
}));

vi.mock('~/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: settingsState.settings,
    setSettings: vi.fn(),
    vision: settingsState.vision,
    setVision: vi.fn()
  })
}));

const calendarProps = vi.hoisted(() => ({
  value: undefined as { schedules: Schedule[] } | undefined
}));

vi.mock('../WeeklyCalendar', () => ({
  WeeklyCalendar: (props: { schedules: Schedule[] }) => {
    calendarProps.value = props;
    return <div data-testid="weekly-calendar" />;
  }
}));

const scheduleOf = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'schedule-1',
  name: '朝の集中',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 3],
  enabled: true,
  ...overrides
});

const presetOf = (id: string, name: string): DashboardPreset => ({
  ...DEFAULT_DISPLAY_SETTINGS,
  id,
  name,
  createdAt: '2026-01-01T00:00:00.000Z'
});

/** 検査に使うキーだけを持つ設定（他のキーは既定のままで表示に関わらない） */
const settingsOf = (schedules: Schedule[]): AppSettings =>
  ({ schedules }) as AppSettings;

function renderTab(
  settings: AppSettings | undefined,
  vision: VisionSettings | undefined = undefined
) {
  settingsState.settings = settings;
  settingsState.vision = vision;

  const handlers = {
    onAddSchedule: vi.fn(),
    onEditSchedule: vi.fn(),
    onDeleteSchedule: vi.fn(),
    onToggleSchedule: vi.fn()
  };
  const result = render(<SchedulesTab {...handlers} />);
  return { ...result, ...handlers };
}

beforeEach(() => {
  settingsState.settings = undefined;
  settingsState.vision = undefined;
  calendarProps.value = undefined;
});

describe('SchedulesTab', () => {
  describe('設定が読み込めていないとき', () => {
    it('例外にならず、追加ボタンだけが使える', () => {
      renderTab(undefined);

      expect(screen.getByTestId('schedule-add-button')).toBeInTheDocument();
      expect(screen.queryAllByTestId('schedule-item')).toHaveLength(0);
    });

    it('カレンダーには空の一覧を渡す', () => {
      renderTab(undefined);

      expect(calendarProps.value?.schedules).toEqual([]);
    });

    it('注意書きを出さない', () => {
      renderTab(undefined);

      expect(
        screen.queryByText('scheduleBlockingNotice')
      ).not.toBeInTheDocument();
    });
  });

  describe('スケジュールが 0 件のとき', () => {
    it('未登録の案内を出す', () => {
      renderTab(settingsOf([]));

      expect(screen.getByText('noSchedules')).toBeInTheDocument();
    });

    it('注意書きを出さない', () => {
      renderTab(settingsOf([]));

      expect(
        screen.queryByText('scheduleBlockingNotice')
      ).not.toBeInTheDocument();
    });
  });

  describe('スケジュールがあるとき', () => {
    it('注意書きを出し、未登録の案内は出さない', () => {
      renderTab(settingsOf([scheduleOf()]));

      expect(screen.getByText('scheduleBlockingNotice')).toBeInTheDocument();
      expect(screen.queryByText('noSchedules')).not.toBeInTheDocument();
    });

    it('すべて無効なら注意書きを出さない（無効だけならスケジュール無しと同じく常にブロックする）', () => {
      renderTab(
        settingsOf([
          scheduleOf({ enabled: false }),
          scheduleOf({ id: 'schedule-2', enabled: false })
        ])
      );

      expect(
        screen.queryByText('scheduleBlockingNotice')
      ).not.toBeInTheDocument();
      expect(screen.getAllByTestId('schedule-item')).toHaveLength(2);
    });

    it('有効なスケジュールが 1 件でもあれば注意書きを出す', () => {
      renderTab(
        settingsOf([
          scheduleOf({ enabled: false }),
          scheduleOf({ id: 'schedule-2', enabled: true })
        ])
      );

      expect(screen.getByText('scheduleBlockingNotice')).toBeInTheDocument();
    });

    it('名前と時間帯を出す', () => {
      renderTab(settingsOf([scheduleOf()]));

      expect(screen.getByText('朝の集中')).toBeInTheDocument();
      expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument();
    });

    it('件数分の行を出し、カレンダーにも同じ一覧を渡す', () => {
      const schedules = [
        scheduleOf(),
        scheduleOf({ id: 'schedule-2', name: '夜の集中' })
      ];
      renderTab(settingsOf(schedules));

      expect(screen.getAllByTestId('schedule-item')).toHaveLength(2);
      expect(calendarProps.value?.schedules).toEqual(schedules);
    });

    it('有効・無効が切り替えの状態に出る', () => {
      renderTab(
        settingsOf([
          scheduleOf({ enabled: true }),
          scheduleOf({ id: 'schedule-2', enabled: false })
        ])
      );

      const toggles = screen.getAllByTestId('schedule-item-toggle');
      expect(toggles[0]).toHaveAttribute('aria-checked', 'true');
      expect(toggles[1]).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('曜日', () => {
    it('登録された曜日だけが有効として出る', () => {
      const { container } = renderTab(
        settingsOf([scheduleOf({ days: [1, 3] })])
      );

      const days = container.querySelectorAll('[data-active]');
      expect(
        Array.from(days).map((d) => d.getAttribute('data-active'))
      ).toEqual(['false', 'true', 'false', 'true', 'false', 'false', 'false']);
    });

    it('曜日が 0 件でも 7 つ並び、どれも有効にならない', () => {
      const { container } = renderTab(settingsOf([scheduleOf({ days: [] })]));

      const days = container.querySelectorAll('[data-active]');
      expect(days).toHaveLength(7);
      for (const day of days) {
        expect(day.getAttribute('data-active')).toBe('false');
      }
    });
  });

  describe('プリセット', () => {
    it('プリセットが未指定なら行そのものを出さない', () => {
      renderTab(settingsOf([scheduleOf()]));

      expect(
        screen.queryByTestId('schedule-item-preset')
      ).not.toBeInTheDocument();
    });

    it('指定したプリセットの名前を出す', () => {
      renderTab(settingsOf([scheduleOf({ presetId: 'preset-1' })]), {
        ...DEFAULT_VISION,
        presets: [presetOf('preset-1', 'スタイル A')]
      });

      expect(screen.getByTestId('schedule-item-preset')).toHaveTextContent(
        'スタイル A'
      );
    });

    it('指定したプリセットが見つからないときは不明として出す', () => {
      renderTab(settingsOf([scheduleOf({ presetId: 'missing' })]), {
        ...DEFAULT_VISION,
        presets: [presetOf('preset-1', 'スタイル A')]
      });

      expect(screen.getByTestId('schedule-item-preset')).toHaveTextContent(
        'unknownPreset'
      );
    });

    it('vision が未設定でも例外にならず不明として出す', () => {
      renderTab(settingsOf([scheduleOf({ presetId: 'preset-1' })]), undefined);

      expect(screen.getByTestId('schedule-item-preset')).toHaveTextContent(
        'unknownPreset'
      );
    });
  });

  describe('操作', () => {
    it('追加ボタンで onAddSchedule が呼ばれる', () => {
      const { onAddSchedule } = renderTab(settingsOf([]));

      fireEvent.click(screen.getByTestId('schedule-add-button'));

      expect(onAddSchedule).toHaveBeenCalledTimes(1);
    });

    it('編集ボタンでそのスケジュールごと onEditSchedule が呼ばれる', () => {
      const schedule = scheduleOf();
      const { onEditSchedule } = renderTab(settingsOf([schedule]));

      fireEvent.click(screen.getByTestId('schedule-item-edit'));

      expect(onEditSchedule).toHaveBeenCalledWith(schedule);
    });

    it('削除ボタンでその ID の onDeleteSchedule が呼ばれる', () => {
      const { onDeleteSchedule } = renderTab(
        settingsOf([scheduleOf({ id: 'schedule-9' })])
      );

      fireEvent.click(screen.getByTestId('schedule-item-delete'));

      expect(onDeleteSchedule).toHaveBeenCalledWith('schedule-9');
    });

    it('有効なスケジュールを切り替えると false で onToggleSchedule が呼ばれる', () => {
      const { onToggleSchedule } = renderTab(
        settingsOf([scheduleOf({ id: 'schedule-9', enabled: true })])
      );

      fireEvent.click(screen.getByTestId('schedule-item-toggle'));

      expect(onToggleSchedule).toHaveBeenCalledWith('schedule-9', false);
    });

    it('無効なスケジュールを切り替えると true で onToggleSchedule が呼ばれる', () => {
      const { onToggleSchedule } = renderTab(
        settingsOf([scheduleOf({ id: 'schedule-9', enabled: false })])
      );

      fireEvent.click(screen.getByTestId('schedule-item-toggle'));

      expect(onToggleSchedule).toHaveBeenCalledWith('schedule-9', true);
    });
  });
});
