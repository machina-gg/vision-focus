import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PresetSelector } from '../PresetSelector';
import { MAX_PRESETS } from '~/constants/limits';
import type { UsePresetsReturn } from '~/hooks/usePresets';
import type { DashboardPreset, VisionSettings } from '~/types/storage';
import { DEFAULT_DISPLAY_SETTINGS, DEFAULT_VISION } from '~/types/storage';
import { stubI18nWithSubstitutions } from '~/test/i18n';

stubI18nWithSubstitutions();

const presetOf = (id: string, name: string): DashboardPreset => ({
  ...DEFAULT_DISPLAY_SETTINGS,
  id,
  name,
  createdAt: '2026-01-01T00:00:00.000Z'
});

function presetsStub(overrides: Partial<UsePresetsReturn> = {}) {
  const stub: UsePresetsReturn = {
    draftDisplaySettings: { ...DEFAULT_DISPLAY_SETTINGS, goalText: '目標' },
    draftPresets: [],
    selectedPresetId: null,
    editingPresetName: 'スタイル A',
    isDirty: false,
    visionSaved: false,
    showSavePresetModal: false,
    presetName: '',
    deleteTargetPresetId: null,
    deleteTargetScheduleCount: 0,
    setShowSavePresetModal: vi.fn(),
    setPresetName: vi.fn(),
    handleSelectPreset: vi.fn(),
    handlePresetNameChange: vi.fn(),
    handleRequestDeletePreset: vi.fn(),
    handleConfirmDeletePreset: vi.fn(),
    handleCancelDeletePreset: vi.fn(),
    handleSaveSelectedPreset: vi.fn(),
    handleApplyPreset: vi.fn(),
    handleCreatePreset: vi.fn(),
    handleGoalTextChange: vi.fn(),
    handleGoalSubTextChange: vi.fn(),
    handleTextColorChange: vi.fn(),
    handleBackgroundTypeChange: vi.fn(),
    handleBackgroundColorChange: vi.fn(),
    handleBackgroundChange: vi.fn(),
    handleCustomBackgroundChange: vi.fn(),
    handleFontSettingsChange: vi.fn(),
    ...overrides
  };
  return stub;
}

const visionWith = (activePresetId: string | null): VisionSettings => ({
  ...DEFAULT_VISION,
  activePresetId
});

function renderSelector(
  overrides: Partial<UsePresetsReturn> = {},
  vision: VisionSettings | undefined = undefined
) {
  const presets = presetsStub(overrides);
  const result = render(<PresetSelector presets={presets} vision={vision} />);
  return { presets, ...result };
}

describe('PresetSelector', () => {
  describe('スタイルが 0 件のとき', () => {
    it('作成を促す案内を出し、スタイルのボタンは出さない', () => {
      renderSelector({ draftPresets: [] });

      expect(screen.getByText('noPresetsTitle')).toBeInTheDocument();
      expect(screen.getByText('noPresetsDescription')).toBeInTheDocument();
      expect(
        screen.queryByTestId('style-preset-button')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('style-new-preset-button')
      ).not.toBeInTheDocument();
    });

    it('最初の 1 件を作るボタンで作成モーダルを開く', () => {
      const { presets } = renderSelector({ draftPresets: [] });

      fireEvent.click(screen.getByTestId('style-create-first-button'));

      expect(presets.setShowSavePresetModal).toHaveBeenCalledWith(true);
    });
  });

  describe('スタイルの一覧', () => {
    it('スタイルの数だけボタンを並べ、名前を出す', () => {
      renderSelector({
        draftPresets: [presetOf('p1', '朝'), presetOf('p2', '夜')]
      });

      expect(screen.getAllByTestId('style-preset-button')).toHaveLength(2);
      expect(screen.getByText('朝')).toBeInTheDocument();
      expect(screen.getByText('夜')).toBeInTheDocument();
      expect(screen.queryByText('noPresetsTitle')).not.toBeInTheDocument();
    });

    it('押すとそのスタイルの ID が渡る', () => {
      const { presets } = renderSelector({
        draftPresets: [presetOf('p1', '朝')]
      });

      fireEvent.click(screen.getByTestId('style-preset-button'));

      expect(presets.handleSelectPreset).toHaveBeenCalledWith('p1');
    });

    it('適用中のスタイルにだけ印を付ける', () => {
      renderSelector(
        { draftPresets: [presetOf('p1', '朝'), presetOf('p2', '夜')] },
        visionWith('p1')
      );

      const buttons = screen.getAllByTestId('style-preset-button');
      expect(
        buttons.map((button) => button.getAttribute('data-active'))
      ).toEqual(['true', 'false']);
    });

    it('どのスタイルも適用されていなければ印は付かない', () => {
      renderSelector(
        { draftPresets: [presetOf('p1', '朝'), presetOf('p2', '夜')] },
        visionWith(null)
      );

      const buttons = screen.getAllByTestId('style-preset-button');
      expect(
        buttons.map((button) => button.getAttribute('data-active'))
      ).toEqual(['false', 'false']);
    });

    it('vision が未取得なら適用中の印は付かない', () => {
      renderSelector({ draftPresets: [presetOf('p1', '朝')] }, undefined);

      expect(screen.getByTestId('style-preset-button')).toHaveAttribute(
        'data-active',
        'false'
      );
    });

    it('選択中のスタイルにだけ押下状態を付ける', () => {
      renderSelector({
        draftPresets: [presetOf('p1', '朝'), presetOf('p2', '夜')],
        selectedPresetId: 'p2'
      });

      const buttons = screen.getAllByTestId('style-preset-button');
      expect(
        buttons.map((button) => button.getAttribute('aria-pressed'))
      ).toEqual(['false', 'true']);
    });

    it('どのスタイルも選択していなければ押下状態は付かない', () => {
      renderSelector({
        draftPresets: [presetOf('p1', '朝'), presetOf('p2', '夜')],
        selectedPresetId: null
      });

      const buttons = screen.getAllByTestId('style-preset-button');
      expect(
        buttons.map((button) => button.getAttribute('aria-pressed'))
      ).toEqual(['false', 'false']);
    });

    it('適用中と選択中は別々に出る', () => {
      renderSelector(
        {
          draftPresets: [presetOf('p1', '朝'), presetOf('p2', '夜')],
          selectedPresetId: 'p2'
        },
        visionWith('p1')
      );

      const buttons = screen.getAllByTestId('style-preset-button');
      expect(
        buttons.map((button) => ({
          active: button.getAttribute('data-active'),
          pressed: button.getAttribute('aria-pressed')
        }))
      ).toEqual([
        { active: 'true', pressed: 'false' },
        { active: 'false', pressed: 'true' }
      ]);
    });
  });

  describe('件数の上限', () => {
    it('上限未満なら新規作成ボタンを出し、上限の案内は出さない', () => {
      renderSelector({ draftPresets: [presetOf('p1', '朝')] });

      expect(screen.getByTestId('style-new-preset-button')).toBeInTheDocument();
      expect(screen.queryByText(/^maxPresetsReached/)).not.toBeInTheDocument();
    });

    it('上限に達したら新規作成ボタンを隠し、上限の案内を出す', () => {
      const draftPresets = Array.from({ length: MAX_PRESETS }, (_, index) =>
        presetOf(`p${index}`, `スタイル ${index}`)
      );
      renderSelector({ draftPresets });

      expect(
        screen.queryByTestId('style-new-preset-button')
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(`maxPresetsReached(${MAX_PRESETS})`)
      ).toBeInTheDocument();
    });

    it('新規作成ボタンで作成モーダルを開く', () => {
      const { presets } = renderSelector({
        draftPresets: [presetOf('p1', '朝')]
      });

      fireEvent.click(screen.getByTestId('style-new-preset-button'));

      expect(presets.setShowSavePresetModal).toHaveBeenCalledWith(true);
    });
  });

  describe('編集中の表示', () => {
    it('選択が無ければ編集中の欄を出さない', () => {
      renderSelector({
        draftPresets: [presetOf('p1', '朝')],
        selectedPresetId: null
      });

      expect(screen.queryByTestId('style-save-button')).not.toBeInTheDocument();
    });

    it('選択中の ID が一覧に無ければ編集中の欄を出さない', () => {
      renderSelector({
        draftPresets: [presetOf('p1', '朝')],
        selectedPresetId: 'removed'
      });

      expect(screen.queryByTestId('style-save-button')).not.toBeInTheDocument();
    });

    it('選択中なら名前つきで編集中と示す', () => {
      renderSelector({
        draftPresets: [presetOf('p1', '朝')],
        selectedPresetId: 'p1'
      });

      expect(screen.getByText('editingPreset(朝)')).toBeInTheDocument();
    });

    it('未保存の変更があるときだけその旨を出す', () => {
      renderSelector({
        draftPresets: [presetOf('p1', '朝')],
        selectedPresetId: 'p1',
        isDirty: true
      });

      expect(screen.getByText('unsavedChanges')).toBeInTheDocument();
    });

    it('変更が無ければ未保存の表示を出さない', () => {
      renderSelector({
        draftPresets: [presetOf('p1', '朝')],
        selectedPresetId: 'p1',
        isDirty: false
      });

      expect(screen.queryByText('unsavedChanges')).not.toBeInTheDocument();
    });
  });

  describe('適用', () => {
    it('未適用なら適用ボタンを出す', () => {
      const { presets } = renderSelector(
        { draftPresets: [presetOf('p1', '朝')], selectedPresetId: 'p1' },
        visionWith(null)
      );

      fireEvent.click(screen.getByTestId('style-apply-button'));

      expect(presets.handleApplyPreset).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('activePreset')).not.toBeInTheDocument();
    });

    it('適用中なら適用ボタンの代わりに適用済みと出す', () => {
      renderSelector(
        { draftPresets: [presetOf('p1', '朝')], selectedPresetId: 'p1' },
        visionWith('p1')
      );

      expect(screen.getByText('activePreset')).toBeInTheDocument();
      expect(
        screen.queryByTestId('style-apply-button')
      ).not.toBeInTheDocument();
    });
  });

  describe('削除', () => {
    it('削除ボタンで選択中のスタイルの ID が渡る', () => {
      const { presets } = renderSelector({
        draftPresets: [presetOf('p1', '朝')],
        selectedPresetId: 'p1'
      });

      fireEvent.click(screen.getByTestId('style-delete-button'));

      expect(presets.handleRequestDeletePreset).toHaveBeenCalledWith('p1');
    });
  });

  describe('保存ボタン', () => {
    const selected = {
      draftPresets: [presetOf('p1', '朝')],
      selectedPresetId: 'p1'
    };

    it('変更があり、目標も名前も入っていれば押せる', () => {
      renderSelector({
        ...selected,
        isDirty: true,
        editingPresetName: '朝',
        draftDisplaySettings: { ...DEFAULT_DISPLAY_SETTINGS, goalText: '目標' }
      });

      expect(screen.getByTestId('style-save-button')).toBeEnabled();
    });

    it('変更が無ければ押せない', () => {
      renderSelector({ ...selected, isDirty: false });

      expect(screen.getByTestId('style-save-button')).toBeDisabled();
    });

    it('目標が空なら押せない', () => {
      renderSelector({
        ...selected,
        isDirty: true,
        draftDisplaySettings: { ...DEFAULT_DISPLAY_SETTINGS, goalText: '' }
      });

      expect(screen.getByTestId('style-save-button')).toBeDisabled();
    });

    it('目標が空白だけなら押せない', () => {
      renderSelector({
        ...selected,
        isDirty: true,
        draftDisplaySettings: {
          ...DEFAULT_DISPLAY_SETTINGS,
          goalText: '   '
        }
      });

      expect(screen.getByTestId('style-save-button')).toBeDisabled();
    });

    it('名前が空白だけなら押せない', () => {
      renderSelector({
        ...selected,
        isDirty: true,
        editingPresetName: '   '
      });

      expect(screen.getByTestId('style-save-button')).toBeDisabled();
    });

    it('押すと保存が呼ばれる', () => {
      const { presets } = renderSelector({ ...selected, isDirty: true });

      fireEvent.click(screen.getByTestId('style-save-button'));

      expect(presets.handleSaveSelectedPreset).toHaveBeenCalledTimes(1);
    });

    it('保存済みならラベルが保存済みに変わる', () => {
      renderSelector({ ...selected, visionSaved: true });

      expect(screen.getByTestId('style-save-button')).toHaveTextContent(
        'saved'
      );
    });

    it('保存前のラベルは保存のまま', () => {
      renderSelector({ ...selected, visionSaved: false });

      expect(screen.getByTestId('style-save-button')).toHaveTextContent('save');
    });
  });
});
