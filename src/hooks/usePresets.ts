import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { trackFeatureUse } from '~/lib/analytics';
import { getVision, settingsItem, visionItem } from '~/lib/storage';
import { presetToDisplaySettings } from '~/lib/presetUtils';
import { loadGoogleFont } from '~/constants/fonts';
import { STATUS_RESET_DELAY_MS } from '~/constants/intervals';
import type {
  AppSettings,
  VisionSettings,
  DashboardPreset,
  DashboardDisplaySettings
} from '~/types/storage';
import type { FontSettings } from '~/types/font';
import { DEFAULT_FONT_SETTINGS, getFontDefinition } from '~/types/font';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

interface UsePresetsOptions {
  /** 保存済みのダッシュボードの設定。読み込み前は undefined */
  vision: VisionSettings | undefined;
  /** 保存したあと画面側のダッシュボードの設定を差し替える */
  setVision: (vision: VisionSettings) => void;
  /** 今のアプリ設定（スケジュールの参照の確認に使う）。読み込み前は undefined */
  settings: AppSettings | undefined;
  /** スケジュールの参照を外したあと画面側のアプリ設定を差し替える */
  setSettings: (settings: AppSettings) => void;
}

/** usePresets が返す値 */
export interface UsePresetsReturn {
  /** 選択中のスタイルの、保存前の表示設定 */
  draftDisplaySettings: DashboardDisplaySettings;
  /** 画面に並べるスタイルの一覧（保存した操作は即座に反映される） */
  draftPresets: DashboardPreset[];
  /** 選択中のスタイルの ID。スタイルが無い・選択中のものを削除したときは null */
  selectedPresetId: string | null;
  /** 選択中のスタイルの、保存前の名前 */
  editingPresetName: string;
  /** 選択中のスタイルに保存していない変更があるか */
  isDirty: boolean;
  /** 保存完了の表示中か（一定時間で false に戻る） */
  visionSaved: boolean;
  /** 新規作成モーダルを表示中か */
  showSavePresetModal: boolean;
  /** 新規作成モーダルに入力中の名前 */
  presetName: string;
  /** 削除の確認待ちになっているスタイルの ID。確認待ちが無ければ null */
  deleteTargetPresetId: string | null;
  /** 確認待ちのスタイルを参照しているスケジュールの件数 */
  deleteTargetScheduleCount: number;
  /** 新規作成モーダルを開閉する */
  setShowSavePresetModal: (show: boolean) => void;
  /** 新規作成モーダルの名前の入力を変える */
  setPresetName: (name: string) => void;
  /** presetId のスタイルを選択し、下書きをその表示設定にする（保存していない変更は捨てる） */
  handleSelectPreset: (presetId: string) => void;
  /** 選択中のスタイルの名前の下書きを変える */
  handlePresetNameChange: (name: string) => void;
  /** スケジュールが参照していれば確認待ちにし、参照が無ければすぐ削除する */
  handleRequestDeletePreset: (id: string) => Promise<void>;
  /** 確認待ちのスタイルを削除し、参照していたスケジュールから外す */
  handleConfirmDeletePreset: () => Promise<void>;
  /** 削除の確認待ちを取り消す */
  handleCancelDeletePreset: () => void;
  /** 下書きを選択中のスタイルへ保存する。目標文か名前が空なら何もしない */
  handleSaveSelectedPreset: () => Promise<void>;
  /** 選択中のスタイルをダッシュボードに表示するスタイルにする */
  handleApplyPreset: () => Promise<void>;
  /** presetName の名前で既定の表示設定のスタイルを作り、選択する */
  handleCreatePreset: () => Promise<void>;
  /** 下書きの目標文を変える */
  handleGoalTextChange: (text: string) => void;
  /** 下書きの補足の文を変える */
  handleGoalSubTextChange: (text: string) => void;
  /** 下書きの文字色（CSS の色の値）を変える */
  handleTextColorChange: (color: string) => void;
  /** 下書きの背景の種類（画像 / 単色）を変える */
  handleBackgroundTypeChange: (type: 'image' | 'color') => void;
  /** 下書きの同梱の背景画像を bgId に変える */
  handleBackgroundChange: (bgId: string) => void;
  /** 下書きの単色の背景（CSS の色の値）を変える */
  handleBackgroundColorChange: (color: string) => void;
  /** 下書きの利用者の背景画像（data URL）を変える。null = 使わない */
  handleCustomBackgroundChange: (dataUrl: string | null) => void;
  /** 下書きの目標文のフォントを変える */
  handleFontSettingsChange: (fontSettings: FontSettings) => void;
}

interface PresetState {
  draftDisplaySettings: DashboardDisplaySettings;
  draftPresets: DashboardPreset[];
  selectedPresetId: string | null;
  editingPresetName: string;
  isDirty: boolean;
  visionSaved: boolean;
  showSavePresetModal: boolean;
  presetName: string;
  deleteTargetPresetId: string | null;
}

type PresetAction =
  | {
      type: 'INITIALIZE';
      presets: DashboardPreset[];
      selectedPresetId: string | null;
      editingPresetName: string;
      displaySettings: DashboardDisplaySettings;
    }
  | { type: 'UPDATE_DISPLAY'; patch: Partial<DashboardDisplaySettings> }
  | {
      type: 'SELECT_PRESET';
      presetId: string;
      name: string;
      displaySettings: DashboardDisplaySettings;
    }
  | { type: 'UPDATE_PRESET_NAME'; name: string }
  | {
      type: 'DELETE_PRESET';
      remainingPresets: DashboardPreset[];
      wasSelected: boolean;
      fallbackSettings: DashboardDisplaySettings;
    }
  | { type: 'SAVE_PRESETS'; updatedPresets: DashboardPreset[] }
  | { type: 'SET_VISION_SAVED'; saved: boolean }
  | {
      type: 'CREATE_PRESET';
      preset: DashboardPreset;
      updatedPresets: DashboardPreset[];
    }
  | { type: 'SET_SHOW_MODAL'; show: boolean }
  | { type: 'SET_PRESET_NAME'; name: string }
  | { type: 'REQUEST_DELETE_PRESET'; presetId: string }
  | { type: 'CLEAR_DELETE_TARGET' };

const INITIAL_STATE: PresetState = {
  draftDisplaySettings: DEFAULT_DISPLAY_SETTINGS,
  draftPresets: [],
  selectedPresetId: null,
  editingPresetName: '',
  isDirty: false,
  visionSaved: false,
  showSavePresetModal: false,
  presetName: '',
  deleteTargetPresetId: null
};

function presetReducer(state: PresetState, action: PresetAction): PresetState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        draftPresets: action.presets,
        selectedPresetId: action.selectedPresetId,
        editingPresetName: action.editingPresetName,
        draftDisplaySettings: action.displaySettings
      };
    case 'UPDATE_DISPLAY':
      return {
        ...state,
        draftDisplaySettings: {
          ...state.draftDisplaySettings,
          ...action.patch
        },
        isDirty: true
      };
    case 'SELECT_PRESET':
      return {
        ...state,
        selectedPresetId: action.presetId,
        editingPresetName: action.name,
        draftDisplaySettings: action.displaySettings,
        isDirty: false
      };
    case 'UPDATE_PRESET_NAME':
      return { ...state, editingPresetName: action.name, isDirty: true };
    case 'DELETE_PRESET':
      return {
        ...state,
        draftPresets: action.remainingPresets,
        selectedPresetId: action.wasSelected ? null : state.selectedPresetId,
        draftDisplaySettings: action.wasSelected
          ? action.fallbackSettings
          : state.draftDisplaySettings,
        isDirty: false,
        deleteTargetPresetId: null
      };
    case 'SAVE_PRESETS':
      return { ...state, draftPresets: action.updatedPresets, isDirty: false };
    case 'SET_VISION_SAVED':
      return { ...state, visionSaved: action.saved };
    case 'CREATE_PRESET':
      return {
        ...state,
        draftPresets: action.updatedPresets,
        selectedPresetId: action.preset.id,
        editingPresetName: action.preset.name,
        draftDisplaySettings: presetToDisplaySettings(action.preset),
        showSavePresetModal: false,
        presetName: '',
        isDirty: false
      };
    case 'SET_SHOW_MODAL':
      return { ...state, showSavePresetModal: action.show };
    case 'SET_PRESET_NAME':
      return { ...state, presetName: action.name };
    case 'REQUEST_DELETE_PRESET':
      return { ...state, deleteTargetPresetId: action.presetId };
    case 'CLEAR_DELETE_TARGET':
      return { ...state, deleteTargetPresetId: null };
  }
}

const SAVED_FEEDBACK_MS = STATUS_RESET_DELAY_MS;

/**
 * スタイル編集画面の下書きと、スタイルの選択・保存・適用・作成・削除の操作を提供する
 * @param options フックの入力（下記の項目）
 * @param options.vision 保存済みのダッシュボードの設定。読み込み前は undefined
 * @param options.setVision 保存したあと画面側のダッシュボードの設定を差し替える関数
 * @param options.settings 今のアプリ設定。読み込み前は undefined
 * @param options.setSettings スケジュールの参照を外したあと画面側のアプリ設定を差し替える関数
 * @returns 下書きの状態と、スタイルと下書きへの各操作
 */
export function usePresets({
  vision,
  setVision,
  settings,
  setSettings
}: UsePresetsOptions): UsePresetsReturn {
  const [state, dispatch] = useReducer(presetReducer, INITIAL_STATE);

  useEffect(() => {
    const initialize = async () => {
      const visionData = await getVision();
      const presets = visionData.presets || [];

      if (presets.length > 0) {
        const activePreset = visionData.activePresetId
          ? presets.find((p) => p.id === visionData.activePresetId)
          : presets[0];
        const target = activePreset || presets[0];
        dispatch({
          type: 'INITIALIZE',
          presets,
          selectedPresetId: target.id,
          editingPresetName: target.name,
          displaySettings: presetToDisplaySettings(target)
        });
      } else {
        dispatch({
          type: 'INITIALIZE',
          presets: [],
          selectedPresetId: null,
          editingPresetName: '',
          displaySettings:
            visionData.defaultSettings || DEFAULT_DISPLAY_SETTINGS
        });
      }
    };
    initialize();
  }, []);

  const { fontSettings: currentFontSettings } = state.draftDisplaySettings;
  useEffect(() => {
    if (!currentFontSettings) return;
    const fontDef = getFontDefinition(currentFontSettings.family);
    if (fontDef.googleFont) loadGoogleFont(fontDef.googleFont);
  }, [currentFontSettings]);

  const displayHandlers = useMemo(
    () => ({
      handleGoalTextChange: (text: string) =>
        dispatch({ type: 'UPDATE_DISPLAY', patch: { goalText: text } }),
      handleGoalSubTextChange: (text: string) =>
        dispatch({ type: 'UPDATE_DISPLAY', patch: { goalSubText: text } }),
      handleTextColorChange: (color: string) =>
        dispatch({ type: 'UPDATE_DISPLAY', patch: { textColor: color } }),
      handleBackgroundTypeChange: (type: 'image' | 'color') =>
        dispatch({ type: 'UPDATE_DISPLAY', patch: { backgroundType: type } }),
      handleBackgroundChange: (bgId: string) =>
        dispatch({ type: 'UPDATE_DISPLAY', patch: { backgroundImage: bgId } }),
      handleBackgroundColorChange: (color: string) =>
        dispatch({
          type: 'UPDATE_DISPLAY',
          patch: { backgroundColor: color }
        }),
      handleCustomBackgroundChange: (dataUrl: string | null) =>
        dispatch({
          type: 'UPDATE_DISPLAY',
          patch: { customBackgroundData: dataUrl }
        }),
      handleFontSettingsChange: (fontSettings: FontSettings) =>
        dispatch({ type: 'UPDATE_DISPLAY', patch: { fontSettings } }),
      handlePresetNameChange: (name: string) =>
        dispatch({ type: 'UPDATE_PRESET_NAME', name }),
      setShowSavePresetModal: (show: boolean) =>
        dispatch({ type: 'SET_SHOW_MODAL', show }),
      setPresetName: (name: string) =>
        dispatch({ type: 'SET_PRESET_NAME', name })
    }),
    []
  );

  // アンマウント後に発火すると片付け済みの画面へ dispatch するので、止められるよう保持する
  const savedFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearSavedFeedbackTimer = useCallback(() => {
    if (savedFeedbackTimerRef.current === null) return;
    clearTimeout(savedFeedbackTimerRef.current);
    savedFeedbackTimerRef.current = null;
  }, []);

  useEffect(() => clearSavedFeedbackTimer, [clearSavedFeedbackTimer]);

  const showSavedFeedback = useCallback(() => {
    dispatch({ type: 'SET_VISION_SAVED', saved: true });
    // 連続保存で古いタイマーが残ると、後から張った表示を先に消してしまう
    clearSavedFeedbackTimer();
    savedFeedbackTimerRef.current = setTimeout(() => {
      savedFeedbackTimerRef.current = null;
      dispatch({ type: 'SET_VISION_SAVED', saved: false });
    }, SAVED_FEEDBACK_MS);
  }, [clearSavedFeedbackTimer]);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const preset = state.draftPresets.find((p) => p.id === presetId);
      if (!preset) return;
      dispatch({
        type: 'SELECT_PRESET',
        presetId,
        name: preset.name,
        displaySettings: presetToDisplaySettings(preset)
      });
    },
    [state.draftPresets]
  );

  const countSchedulesUsingPreset = useCallback(
    (presetId: string) =>
      (settings?.schedules ?? []).filter((s) => s.presetId === presetId).length,
    [settings]
  );

  const deleteTargetScheduleCount = useMemo(
    () =>
      state.deleteTargetPresetId
        ? countSchedulesUsingPreset(state.deleteTargetPresetId)
        : 0,
    [state.deleteTargetPresetId, countSchedulesUsingPreset]
  );

  const deletePreset = useCallback(
    async (id: string) => {
      // スケジュール側の連携を先に外す（vision を先に書くと、途中で失敗したとき宛先のない presetId が残る）
      const schedules = settings?.schedules ?? [];
      if (settings && schedules.some((s) => s.presetId === id)) {
        const updatedSettings: AppSettings = {
          ...settings,
          schedules: schedules.map((s) =>
            s.presetId === id ? { ...s, presetId: undefined } : s
          )
        };
        await settingsItem.setValue(updatedSettings);
        setSettings(updatedSettings);
      }

      const remainingPresets = state.draftPresets.filter((p) => p.id !== id);
      dispatch({
        type: 'DELETE_PRESET',
        remainingPresets,
        wasSelected: id === state.selectedPresetId,
        fallbackSettings: vision?.defaultSettings || DEFAULT_DISPLAY_SETTINGS
      });
      const toSave: VisionSettings = {
        defaultSettings: vision?.defaultSettings || DEFAULT_DISPLAY_SETTINGS,
        presets: remainingPresets,
        activePresetId:
          vision?.activePresetId === id ? null : vision?.activePresetId || null
      };
      await visionItem.setValue(toSave);
      setVision(toSave);
    },
    [
      state.draftPresets,
      state.selectedPresetId,
      vision,
      setVision,
      settings,
      setSettings
    ]
  );

  const handleRequestDeletePreset = useCallback(
    async (id: string) => {
      if (countSchedulesUsingPreset(id) > 0) {
        dispatch({ type: 'REQUEST_DELETE_PRESET', presetId: id });
        return;
      }
      await deletePreset(id);
    },
    [countSchedulesUsingPreset, deletePreset]
  );

  const handleConfirmDeletePreset = useCallback(async () => {
    if (!state.deleteTargetPresetId) return;
    await deletePreset(state.deleteTargetPresetId);
  }, [state.deleteTargetPresetId, deletePreset]);

  const handleCancelDeletePreset = useCallback(() => {
    dispatch({ type: 'CLEAR_DELETE_TARGET' });
  }, []);

  const handleSaveSelectedPreset = useCallback(async () => {
    const { selectedPresetId, draftDisplaySettings, editingPresetName } = state;
    if (
      !selectedPresetId ||
      !draftDisplaySettings.goalText.trim() ||
      !editingPresetName.trim()
    )
      return;

    const updatedPresets = state.draftPresets.map((p) =>
      p.id === selectedPresetId
        ? {
            ...p,
            name: editingPresetName.trim(),
            goalText: draftDisplaySettings.goalText.trim(),
            goalSubText: draftDisplaySettings.goalSubText.trim(),
            textColor: draftDisplaySettings.textColor,
            backgroundType: draftDisplaySettings.backgroundType,
            backgroundImage: draftDisplaySettings.backgroundImage,
            backgroundColor: draftDisplaySettings.backgroundColor,
            customBackgroundData: draftDisplaySettings.customBackgroundData,
            fontSettings: draftDisplaySettings.fontSettings
          }
        : p
    );
    dispatch({ type: 'SAVE_PRESETS', updatedPresets });
    const toSave: VisionSettings = {
      defaultSettings: vision?.defaultSettings || DEFAULT_DISPLAY_SETTINGS,
      presets: updatedPresets,
      activePresetId: vision?.activePresetId || null
    };
    await visionItem.setValue(toSave);
    setVision(toSave);
    showSavedFeedback();
  }, [state, vision, setVision, showSavedFeedback]);

  const handleApplyPreset = useCallback(async () => {
    if (!state.selectedPresetId || !vision) return;
    const toSave: VisionSettings = {
      ...vision,
      activePresetId: state.selectedPresetId
    };
    await visionItem.setValue(toSave);
    setVision(toSave);
    showSavedFeedback();
    trackFeatureUse('preset_switch');
  }, [state.selectedPresetId, vision, setVision, showSavedFeedback]);

  const handleCreatePreset = useCallback(async () => {
    if (!state.presetName.trim()) return;
    const newPreset: DashboardPreset = {
      id: crypto.randomUUID(),
      name: state.presetName.trim(),
      goalText: DEFAULT_DISPLAY_SETTINGS.goalText,
      goalSubText: DEFAULT_DISPLAY_SETTINGS.goalSubText,
      textColor: DEFAULT_DISPLAY_SETTINGS.textColor,
      backgroundType: DEFAULT_DISPLAY_SETTINGS.backgroundType,
      backgroundImage: DEFAULT_DISPLAY_SETTINGS.backgroundImage,
      backgroundColor: DEFAULT_DISPLAY_SETTINGS.backgroundColor,
      customBackgroundData: null,
      fontSettings: DEFAULT_FONT_SETTINGS,
      createdAt: new Date().toISOString()
    };
    const updatedPresets = [...state.draftPresets, newPreset];
    dispatch({ type: 'CREATE_PRESET', preset: newPreset, updatedPresets });
    const toSave: VisionSettings = {
      defaultSettings: vision?.defaultSettings || DEFAULT_DISPLAY_SETTINGS,
      presets: updatedPresets,
      activePresetId: vision?.activePresetId || null
    };
    await visionItem.setValue(toSave);
    setVision(toSave);
    trackFeatureUse('preset_create');
  }, [state.presetName, state.draftPresets, vision, setVision]);

  return {
    ...state,
    ...displayHandlers,
    deleteTargetScheduleCount,
    handleSelectPreset,
    handleRequestDeletePreset,
    handleConfirmDeletePreset,
    handleCancelDeletePreset,
    handleSaveSelectedPreset,
    handleApplyPreset,
    handleCreatePreset
  };
}
