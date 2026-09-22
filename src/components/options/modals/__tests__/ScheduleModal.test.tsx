import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ScheduleModal } from '../ScheduleModal';
import type { ScheduleFormData } from '~/hooks/useSchedules';
import type { Schedule } from '~/types/storage';
import type { DashboardPreset, VisionSettings } from '~/types/vision';
import { DEFAULT_DISPLAY_SETTINGS, DEFAULT_VISION } from '~/types/vision';

/**
 * ScheduleModal の新規・編集の出し分けと、フォームの変更で渡る値の検査
 *
 * 入力の状態は親が持つ（onFormChange で丸ごと返す）ため、「どのキーだけを
 * 差し替えて返すか」を見る。曜日の選択中は aria-pressed に出ている。
 *
 * 終了時刻の 24:00 は保存の内部表現で、入力欄には 00:00 として出す。
 * この読み替えが片方向（表示のみ）であることも含めて見る。
 */

const BASE_FORM: ScheduleFormData = {
  name: '朝の集中',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 3],
  presetId: ''
};

const EDITING: Schedule = {
  id: 'schedule-1',
  name: '朝の集中',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 3],
  enabled: true
};

const presetOf = (id: string, name: string): DashboardPreset => ({
  ...DEFAULT_DISPLAY_SETTINGS,
  id,
  name,
  createdAt: '2026-01-01T00:00:00.000Z'
});

const visionOf = (presets: DashboardPreset[]): VisionSettings => ({
  ...DEFAULT_VISION,
  presets
});

function renderModal(
  overrides: Partial<React.ComponentProps<typeof ScheduleModal>> = {}
) {
  const onClose = vi.fn();
  const onFormChange = vi.fn();
  const onSave = vi.fn();
  const result = render(
    <ScheduleModal
      isOpen
      onClose={onClose}
      editingSchedule={null}
      scheduleForm={BASE_FORM}
      onFormChange={onFormChange}
      onSave={onSave}
      vision={undefined}
      {...overrides}
    />
  );
  return { ...result, onClose, onFormChange, onSave };
}

describe('ScheduleModal', () => {
  describe('開閉', () => {
    it('閉じているときは何も描画しない', () => {
      const { container } = renderModal({ isOpen: false });

      expect(container).toBeEmptyDOMElement();
    });

    it('取り消しを押すと onClose が呼ばれる', () => {
      const { onClose } = renderModal();

      fireEvent.click(screen.getByTestId('schedule-cancel-button'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('新規追加のとき', () => {
    it('見出しと保存ボタンが「追加」の文言になる', () => {
      renderModal();

      expect(screen.getByRole('heading')).toHaveTextContent('addSchedule');
      expect(screen.getByTestId('schedule-save-button')).toHaveTextContent(
        'addSchedule'
      );
    });
  });

  describe('編集のとき', () => {
    it('見出しと保存ボタンが「編集」「変更を保存」の文言になる', () => {
      renderModal({ editingSchedule: EDITING });

      expect(screen.getByRole('heading')).toHaveTextContent('editSchedule');
      expect(screen.getByTestId('schedule-save-button')).toHaveTextContent(
        'saveChanges'
      );
    });
  });

  describe('入力', () => {
    it('名前を変えると名前だけを差し替えたフォームが渡る', () => {
      const { onFormChange } = renderModal();

      fireEvent.change(screen.getByTestId('schedule-name-input'), {
        target: { value: '夜の集中' }
      });

      expect(onFormChange).toHaveBeenCalledWith({
        ...BASE_FORM,
        name: '夜の集中'
      });
    });

    it('開始時刻を変えると開始時刻だけを差し替えたフォームが渡る', () => {
      const { onFormChange } = renderModal();

      fireEvent.change(screen.getByTestId('schedule-start-time'), {
        target: { value: '08:30' }
      });

      expect(onFormChange).toHaveBeenCalledWith({
        ...BASE_FORM,
        startTime: '08:30'
      });
    });

    it('終了時刻を変えると終了時刻だけを差し替えたフォームが渡る', () => {
      const { onFormChange } = renderModal();

      fireEvent.change(screen.getByTestId('schedule-end-time'), {
        target: { value: '18:00' }
      });

      expect(onFormChange).toHaveBeenCalledWith({
        ...BASE_FORM,
        endTime: '18:00'
      });
    });
  });

  describe('終了時刻の 24:00', () => {
    it('保存値が 24:00 のときは入力欄に 00:00 と出す', () => {
      renderModal({ scheduleForm: { ...BASE_FORM, endTime: '24:00' } });

      expect(screen.getByTestId('schedule-end-time')).toHaveValue('00:00');
    });

    it('読み替えは表示だけで、選び直した値はそのまま渡す', () => {
      const form = { ...BASE_FORM, endTime: '24:00' };
      const { onFormChange } = renderModal({ scheduleForm: form });

      fireEvent.change(screen.getByTestId('schedule-end-time'), {
        target: { value: '23:30' }
      });

      expect(onFormChange).toHaveBeenCalledWith({ ...form, endTime: '23:30' });
    });
  });

  describe('曜日の選択', () => {
    it('フォームに含まれる曜日だけが選択中になる', () => {
      renderModal();

      const days = screen.getAllByTestId('schedule-day-button');
      expect(days.map((d) => d.getAttribute('aria-pressed'))).toEqual([
        'false', // 日
        'true', // 月
        'false', // 火
        'true', // 水
        'false', // 木
        'false', // 金
        'false' // 土
      ]);
    });

    it('選んでいない曜日を押すと、番号順に並べて追加される', () => {
      const { onFormChange } = renderModal();

      // 火曜（idx=2）を押す
      fireEvent.click(screen.getAllByTestId('schedule-day-button')[2]);

      expect(onFormChange).toHaveBeenCalledWith({
        ...BASE_FORM,
        days: [1, 2, 3]
      });
    });

    it('選んでいる曜日を押すと外れる', () => {
      const { onFormChange } = renderModal();

      // 月曜（idx=1）を押す
      fireEvent.click(screen.getAllByTestId('schedule-day-button')[1]);

      expect(onFormChange).toHaveBeenCalledWith({ ...BASE_FORM, days: [3] });
    });

    it('曜日が 0 件でも例外にならず、どれも選択中にならない', () => {
      renderModal({ scheduleForm: { ...BASE_FORM, days: [] } });

      for (const day of screen.getAllByTestId('schedule-day-button')) {
        expect(day).toHaveAttribute('aria-pressed', 'false');
      }
    });
  });

  describe('プリセットの選択', () => {
    it('vision が未設定でも未選択の選択肢だけを出す', () => {
      renderModal({ vision: undefined });

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('noPresetSelected');
    });

    it('プリセットが 0 件でも未選択の選択肢だけを出す', () => {
      renderModal({ vision: visionOf([]) });

      expect(screen.getAllByRole('option')).toHaveLength(1);
    });

    it('プリセットがあるときは未選択に続けて名前を並べる', () => {
      renderModal({
        vision: visionOf([
          presetOf('preset-1', 'スタイル A'),
          presetOf('preset-2', 'スタイル B')
        ])
      });

      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
        'noPresetSelected',
        'スタイル A',
        'スタイル B'
      ]);
    });

    it('プリセットを選ぶと presetId だけを差し替えたフォームが渡る', () => {
      const { onFormChange } = renderModal({
        vision: visionOf([presetOf('preset-1', 'スタイル A')])
      });

      fireEvent.change(screen.getByTestId('schedule-preset-select'), {
        target: { value: 'preset-1' }
      });

      expect(onFormChange).toHaveBeenCalledWith({
        ...BASE_FORM,
        presetId: 'preset-1'
      });
    });
  });

  describe('エラー表示', () => {
    it('エラーが無いときは何も出さない', () => {
      renderModal();

      expect(screen.queryByTestId('schedule-error')).toBeNull();
    });

    it('エラーを渡すと文言を出す', () => {
      renderModal({ error: '既存のスケジュールと重複しています。' });

      expect(screen.getByTestId('schedule-error')).toHaveTextContent(
        '既存のスケジュールと重複しています。'
      );
    });

    it('エラーがあっても保存ボタンは押せる（直してから再度保存できる）', () => {
      const { onSave } = renderModal({ error: '重複' });

      const save = screen.getByTestId('schedule-save-button');
      expect(save).not.toBeDisabled();

      fireEvent.click(save);
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('保存', () => {
    it('名前が入っていれば保存できる', () => {
      const { onSave } = renderModal();

      fireEvent.click(screen.getByTestId('schedule-save-button'));

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('名前が空のときは保存ボタンを押せない', () => {
      renderModal({ scheduleForm: { ...BASE_FORM, name: '' } });

      expect(screen.getByTestId('schedule-save-button')).toBeDisabled();
    });

    it('名前が空白だけのときも保存ボタンを押せない', () => {
      const { onSave } = renderModal({
        scheduleForm: { ...BASE_FORM, name: '   ' }
      });

      const save = screen.getByTestId('schedule-save-button');
      expect(save).toBeDisabled();

      fireEvent.click(save);
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
