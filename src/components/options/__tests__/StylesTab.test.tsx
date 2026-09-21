import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { StylesTab } from '../StylesTab';
import type { UsePresetsReturn } from '~/hooks/usePresets';
import type { DashboardDisplaySettings } from '~/types/storage';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

/**
 * StylesTab のプレビュー欄の出し分けと、背景の決まり方の検査
 *
 * プレビューはスタイルを編集しているときだけ出る。背景は
 * 「色 → 取り込んだ画像 → 既定の画像」の順で決まり、どれも未設定の
 * 保存データでは既定の画像へ倒れる。この優先順位を見る。
 *
 * 状態は usePresets が持つため戻り値ごと差し替える
 * （実体は chrome.storage を読みに行き、テストから値を決められない）。
 * 段組みのクラス名は検査しない。
 */

// 背景画像の URL は chrome.runtime.getURL を経由する（テスト環境には無い）
vi.mock('~/constants/backgrounds', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('~/constants/backgrounds')>();
  return {
    ...actual,
    getBackgroundUrl: (bgId: string) => `stub://backgrounds/${bgId}.webp`
  };
});

const presetsState = vi.hoisted(() => ({
  value: undefined as unknown
}));

vi.mock('~/hooks', () => ({
  usePresets: () => presetsState.value,
  useStorageItem: () => [undefined, vi.fn()]
}));

// スタイルの一覧と設定フォームは別コンポーネントの責務
vi.mock('../styles', () => ({
  PresetSelector: () => <div data-testid="preset-selector" />,
  DisplaySettingsForm: () => <div data-testid="display-settings-form" />
}));

vi.mock('~/components/options/modals', () => ({
  NewPresetModal: (props: { isOpen: boolean }) => (
    <div data-testid="new-preset-modal">{String(props.isOpen)}</div>
  ),
  DeletePresetModal: (props: { isOpen: boolean; scheduleCount: number }) => (
    <div data-testid="delete-preset-modal">
      {String(props.isOpen)}:{props.scheduleCount}
    </div>
  )
}));

/** usePresets の戻り値。テストで見るものだけ上書きする */
function presetsStub(overrides: Partial<UsePresetsReturn> = {}) {
  const stub: UsePresetsReturn = {
    draftDisplaySettings: { ...DEFAULT_DISPLAY_SETTINGS },
    draftPresets: [],
    selectedPresetId: 'preset-1',
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
    handleBackgroundChange: vi.fn(),
    handleBackgroundColorChange: vi.fn(),
    handleCustomBackgroundChange: vi.fn(),
    handleFontSettingsChange: vi.fn(),
    ...overrides
  };
  return stub;
}

function renderTab(overrides: Partial<UsePresetsReturn> = {}) {
  presetsState.value = presetsStub(overrides);
  return render(<StylesTab />);
}

/** 表示設定だけを差し替えた draftDisplaySettings */
const displayWith = (
  overrides: Partial<DashboardDisplaySettings>
): DashboardDisplaySettings => ({ ...DEFAULT_DISPLAY_SETTINGS, ...overrides });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StylesTab', () => {
  describe('スタイルを編集していないとき', () => {
    it('プレビュー欄を出さない', () => {
      renderTab({ selectedPresetId: null });

      expect(screen.queryByTestId('style-preview')).not.toBeInTheDocument();
      expect(screen.queryByText('dashboardPreview')).not.toBeInTheDocument();
    });

    it('スタイルの一覧と設定フォームは出す', () => {
      renderTab({ selectedPresetId: null });

      expect(screen.getByTestId('preset-selector')).toBeInTheDocument();
      expect(screen.getByTestId('display-settings-form')).toBeInTheDocument();
    });
  });

  describe('スタイルを編集しているとき', () => {
    it('プレビュー欄を出す', () => {
      renderTab({ selectedPresetId: 'preset-1' });

      expect(screen.getByTestId('style-preview')).toBeInTheDocument();
      expect(screen.getByText('dashboardPreview')).toBeInTheDocument();
    });
  });

  describe('プレビューの目標', () => {
    it('目標が未入力のときはプレースホルダの文言を出す', () => {
      renderTab({ draftDisplaySettings: displayWith({ goalText: '' }) });

      expect(screen.getByText('goalPreviewPlaceholder')).toBeInTheDocument();
    });

    it('目標があるときはその文字を出す', () => {
      renderTab({
        draftDisplaySettings: displayWith({ goalText: '毎朝 6 時に起きる' })
      });

      expect(screen.getByText('毎朝 6 時に起きる')).toBeInTheDocument();
      expect(
        screen.queryByText('goalPreviewPlaceholder')
      ).not.toBeInTheDocument();
    });

    it('サブメッセージが空のときは行ごと出さない', () => {
      renderTab({ draftDisplaySettings: displayWith({ goalSubText: '' }) });

      expect(screen.queryByText('今日も進もう')).not.toBeInTheDocument();
    });

    it('サブメッセージがあるときはその文字を出す', () => {
      renderTab({
        draftDisplaySettings: displayWith({ goalSubText: '今日も進もう' })
      });

      expect(screen.getByText('今日も進もう')).toBeInTheDocument();
    });
  });

  describe('プレビューの背景', () => {
    it('種類が色のときは選んだ色を敷く', () => {
      renderTab({
        draftDisplaySettings: displayWith({
          backgroundType: 'color',
          backgroundColor: '#112233',
          customBackgroundData: 'data:image/webp;base64,AAAA'
        })
      });

      expect(screen.getByTestId('style-preview')).toHaveStyle({
        backgroundColor: '#112233'
      });
    });

    it('種類が画像で取り込んだ画像があるときはそれを敷く', () => {
      renderTab({
        draftDisplaySettings: displayWith({
          backgroundType: 'image',
          customBackgroundData: 'data:image/webp;base64,AAAA'
        })
      });

      expect(screen.getByTestId('style-preview')).toHaveStyle({
        backgroundImage: 'url(data:image/webp;base64,AAAA)'
      });
    });

    it('取り込んだ画像が無いときは選んだ既定の画像を敷く', () => {
      renderTab({
        draftDisplaySettings: displayWith({
          backgroundType: 'image',
          backgroundImage: 'default-3',
          customBackgroundData: null
        })
      });

      expect(screen.getByTestId('style-preview')).toHaveStyle({
        backgroundImage: 'url(stub://backgrounds/default-3.webp)'
      });
    });

    it('背景画像が未設定のときは default-1 へ倒す', () => {
      // 古い保存データには backgroundImage が無い
      renderTab({
        draftDisplaySettings: displayWith({
          backgroundType: 'image',
          backgroundImage: '',
          customBackgroundData: null
        })
      });

      expect(screen.getByTestId('style-preview')).toHaveStyle({
        backgroundImage: 'url(stub://backgrounds/default-1.webp)'
      });
    });
  });

  describe('スタイルの追加・削除の確認', () => {
    it('保存の確認は showSavePresetModal に従って開く', () => {
      renderTab({ showSavePresetModal: true });

      expect(screen.getByTestId('new-preset-modal')).toHaveTextContent('true');
    });

    it('保存の確認は既定では閉じている', () => {
      renderTab({ showSavePresetModal: false });

      expect(screen.getByTestId('new-preset-modal')).toHaveTextContent('false');
    });

    it('削除の確認は対象が決まっていないときは閉じている', () => {
      renderTab({ deleteTargetPresetId: null });

      expect(screen.getByTestId('delete-preset-modal')).toHaveTextContent(
        'false:0'
      );
    });

    it('削除の確認は対象と参照しているスケジュールの件数を受け取る', () => {
      renderTab({
        deleteTargetPresetId: 'preset-1',
        deleteTargetScheduleCount: 2
      });

      expect(screen.getByTestId('delete-preset-modal')).toHaveTextContent(
        'true:2'
      );
    });
  });
});
