import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DisplaySettingsForm } from '../DisplaySettingsForm';
import { BACKGROUND_OPTIONS } from '~/constants/backgrounds';
import type { UsePresetsReturn } from '~/hooks/usePresets';
import type {
  DashboardDisplaySettings,
  DashboardPreset
} from '~/types/storage';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';
import { DEFAULT_FONT_SETTINGS } from '~/types/font';

/**
 * DisplaySettingsForm の表示分岐と、変更したときに渡る値の検査
 *
 * スタイルが選ばれていないときはフォームごと出さない。背景は「画像」と
 * 「色」で出る欄が入れ替わり、未設定（保存データが古い場合）は画像側へ
 * 倒れる決まりなので、その境界を見る。
 *
 * 状態は usePresets が持つため戻り値ごと差し替える
 * （実体は chrome.storage を読みに行き、テストから値を決められない）。
 * 選択中の背景・種別ボタンの強調はクラス名にしか出ないため検査しない。
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

// 画像の読み込みとフォントの適用は別コンポーネントの責務。
// ここでは受け取った値を読める形に差し替える
vi.mock('~/components/features', () => ({
  ImageUploader: (props: { value: string | null }) => (
    <div data-testid="image-uploader">{String(props.value)}</div>
  ),
  FontPicker: (props: { value: { family: string }; previewText: string }) => (
    <div data-testid="font-picker">
      <span data-testid="font-family">{props.value.family}</span>
      <span data-testid="font-preview-text">{props.previewText}</span>
    </div>
  )
}));

const presetOf = (id: string, name: string): DashboardPreset => ({
  ...DEFAULT_DISPLAY_SETTINGS,
  id,
  name,
  createdAt: '2026-01-01T00:00:00.000Z'
});

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

function renderForm(overrides: Partial<UsePresetsReturn> = {}) {
  const presets = presetsStub(overrides);
  const view = render(<DisplaySettingsForm presets={presets} />);
  return { presets, ...view };
}

/** 背景の設定だけを差し替えた draftDisplaySettings */
const displayWith = (
  overrides: Partial<DashboardDisplaySettings>
): DashboardDisplaySettings => ({ ...DEFAULT_DISPLAY_SETTINGS, ...overrides });

describe('DisplaySettingsForm', () => {
  describe('スタイルが選ばれていないとき', () => {
    it('フォームを何も描画しない', () => {
      const { container } = renderForm({ selectedPresetId: null });

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('スタイル名', () => {
    it('選択中の ID が draftPresets に無いときは名前の欄を出さない', () => {
      renderForm({
        selectedPresetId: 'preset-1',
        draftPresets: [presetOf('preset-2', 'ほかのスタイル')]
      });

      expect(
        screen.queryByTestId('style-preset-name-input')
      ).not.toBeInTheDocument();
    });

    it('選択中のスタイルがあるときは名前の欄に編集中の名前を出す', () => {
      renderForm({
        selectedPresetId: 'preset-1',
        draftPresets: [presetOf('preset-1', '集中モード')],
        editingPresetName: '編集中の名前'
      });

      expect(screen.getByTestId('style-preset-name-input')).toHaveValue(
        '編集中の名前'
      );
    });

    it('名前を変えると入力した値で handlePresetNameChange が呼ばれる', () => {
      const { presets } = renderForm({
        selectedPresetId: 'preset-1',
        draftPresets: [presetOf('preset-1', '集中モード')]
      });

      fireEvent.change(screen.getByTestId('style-preset-name-input'), {
        target: { value: '新しい名前' }
      });

      expect(presets.handlePresetNameChange).toHaveBeenCalledWith('新しい名前');
    });
  });

  describe('目標とサブメッセージ', () => {
    it('目標が未入力でも入力欄を出す', () => {
      renderForm({ draftDisplaySettings: displayWith({ goalText: '' }) });

      expect(screen.getByTestId('style-goal-input')).toHaveValue('');
    });

    it('目標を変えると入力した値で handleGoalTextChange が呼ばれる', () => {
      const { presets } = renderForm();

      fireEvent.change(screen.getByTestId('style-goal-input'), {
        target: { value: '毎日 30 分読む' }
      });

      expect(presets.handleGoalTextChange).toHaveBeenCalledWith(
        '毎日 30 分読む'
      );
    });

    it('サブメッセージが空のとき文字数は 0 と出る', () => {
      renderForm({ draftDisplaySettings: displayWith({ goalSubText: '' }) });

      expect(screen.getByText('0 / 100')).toBeInTheDocument();
    });

    it('サブメッセージの文字数を数えて出す', () => {
      renderForm({
        draftDisplaySettings: displayWith({ goalSubText: 'あいうえお' })
      });

      expect(screen.getByText('5 / 100')).toBeInTheDocument();
    });

    it('サブメッセージは 100 文字までに制限される', () => {
      renderForm();

      expect(screen.getByTestId('style-goal-subtext')).toHaveAttribute(
        'maxlength',
        '100'
      );
    });

    it('サブメッセージを変えると入力した値で handleGoalSubTextChange が呼ばれる', () => {
      const { presets } = renderForm();

      fireEvent.change(screen.getByTestId('style-goal-subtext'), {
        target: { value: '今日も進もう' }
      });

      expect(presets.handleGoalSubTextChange).toHaveBeenCalledWith(
        '今日も進もう'
      );
    });
  });

  describe('文字色', () => {
    it('色の選択と文字入力の両方に同じ値を出す', () => {
      renderForm({
        draftDisplaySettings: displayWith({ textColor: '#ff0000' })
      });

      expect(screen.getByTestId('style-text-color-picker')).toHaveValue(
        '#ff0000'
      );
      // 色の選択と文字入力の 2 つが同じ値を持つ
      expect(screen.getAllByDisplayValue('#ff0000')).toHaveLength(2);
    });

    it('色を選ぶと選んだ色で handleTextColorChange が呼ばれる', () => {
      const { presets } = renderForm();

      fireEvent.change(screen.getByTestId('style-text-color-picker'), {
        target: { value: '#00ff00' }
      });

      expect(presets.handleTextColorChange).toHaveBeenCalledWith('#00ff00');
    });

    it('文字で入れても同じコールバックが呼ばれる', () => {
      const { presets } = renderForm({
        draftDisplaySettings: displayWith({ textColor: '#ffffff' })
      });

      fireEvent.change(screen.getByPlaceholderText('#ffffff'), {
        target: { value: '#123456' }
      });

      expect(presets.handleTextColorChange).toHaveBeenCalledWith('#123456');
    });
  });

  describe('背景の種類が画像のとき', () => {
    it('背景画像の選択肢をすべて出し、色の入力は出さない', () => {
      renderForm({
        draftDisplaySettings: displayWith({ backgroundType: 'image' })
      });

      expect(screen.getAllByTestId('style-bg-option')).toHaveLength(
        BACKGROUND_OPTIONS.length
      );
      expect(screen.queryByPlaceholderText('#1a1a2e')).not.toBeInTheDocument();
    });

    it('背景を選ぶとその ID で handleBackgroundChange が呼ばれる', () => {
      const { presets } = renderForm();

      fireEvent.click(
        screen.getByAltText('Mountain1').closest('button') as HTMLButtonElement
      );

      expect(presets.handleBackgroundChange).toHaveBeenCalledWith('default-3');
    });

    it('色に切り替えるボタンを押すと color が渡る', () => {
      const { presets } = renderForm();

      fireEvent.click(screen.getByTestId('style-bg-type-color'));

      expect(presets.handleBackgroundTypeChange).toHaveBeenCalledWith('color');
    });
  });

  describe('背景の種類が未設定のとき', () => {
    it('画像として扱い、画像の選択肢を出す', () => {
      // 古い保存データには backgroundType が無い
      renderForm({
        draftDisplaySettings: displayWith({
          backgroundType: undefined as unknown as 'image'
        })
      });

      expect(screen.getAllByTestId('style-bg-option')).toHaveLength(
        BACKGROUND_OPTIONS.length
      );
      expect(screen.queryByPlaceholderText('#1a1a2e')).not.toBeInTheDocument();
    });
  });

  describe('背景の種類が色のとき', () => {
    it('色の入力を出し、画像の選択肢は出さない', () => {
      renderForm({
        draftDisplaySettings: displayWith({
          backgroundType: 'color',
          backgroundColor: '#112233'
        })
      });

      expect(screen.queryAllByTestId('style-bg-option')).toHaveLength(0);
      expect(screen.getByPlaceholderText('#1a1a2e')).toHaveValue('#112233');
    });

    it('色を変えると選んだ色で handleBackgroundColorChange が呼ばれる', () => {
      const { presets } = renderForm({
        draftDisplaySettings: displayWith({ backgroundType: 'color' })
      });

      fireEvent.change(screen.getByPlaceholderText('#1a1a2e'), {
        target: { value: '#abcdef' }
      });

      expect(presets.handleBackgroundColorChange).toHaveBeenCalledWith(
        '#abcdef'
      );
    });

    it('画像に切り替えるボタンを押すと image が渡る', () => {
      const { presets } = renderForm({
        draftDisplaySettings: displayWith({ backgroundType: 'color' })
      });

      fireEvent.click(screen.getByTestId('style-bg-type-image'));

      expect(presets.handleBackgroundTypeChange).toHaveBeenCalledWith('image');
    });
  });

  describe('取り込んだ背景画像', () => {
    it('未設定のときは null を渡す', () => {
      renderForm({
        draftDisplaySettings: displayWith({ customBackgroundData: null })
      });

      expect(screen.getByTestId('image-uploader')).toHaveTextContent('null');
    });

    it('設定済みのときはその内容を渡す', () => {
      renderForm({
        draftDisplaySettings: displayWith({
          customBackgroundData: 'data:image/webp;base64,AAAA'
        })
      });

      expect(screen.getByTestId('image-uploader')).toHaveTextContent(
        'data:image/webp;base64,AAAA'
      );
    });
  });

  describe('フォント', () => {
    it('フォント設定が未設定のときは既定値を渡す', () => {
      renderForm({
        draftDisplaySettings: displayWith({
          fontSettings: undefined as unknown as typeof DEFAULT_FONT_SETTINGS
        })
      });

      expect(screen.getByTestId('font-family')).toHaveTextContent(
        DEFAULT_FONT_SETTINGS.family
      );
    });

    it('目標が未入力のときはプレビュー文にプレースホルダを渡す', () => {
      renderForm({ draftDisplaySettings: displayWith({ goalText: '' }) });

      expect(screen.getByTestId('font-preview-text')).toHaveTextContent(
        'goalPlaceholder'
      );
    });

    it('目標があるときはその文字をプレビュー文に渡す', () => {
      renderForm({
        draftDisplaySettings: displayWith({ goalText: '毎朝 6 時に起きる' })
      });

      expect(screen.getByTestId('font-preview-text')).toHaveTextContent(
        '毎朝 6 時に起きる'
      );
    });
  });
});
