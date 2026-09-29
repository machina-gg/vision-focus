import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { trackFeatureUse } from '~/lib/analytics';
import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';
import { presetToDisplaySettings } from '~/lib/presetUtils';
import { loadGoogleFont } from '~/constants/fonts';
import { STATUS_RESET_DELAY_MS } from '~/constants/intervals';
import type { MessageError } from '~/types/messages';
import type {
  AppSettings,
  VisionSettings,
  DashboardPreset,
  DashboardDisplaySettings
} from '~/types/storage';
import type { FontSettings } from '~/types/font';
import { getFontDefinition } from '~/types/font';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

interface UsePresetsOptions {
  /** 保存済みのダッシュボードの設定（保存値の購読）。読み込み前は undefined */
  vision: VisionSettings | undefined;
  /** 今のアプリ設定（削除の確認に出すスケジュールの参照の件数に使う）。読み込み前は undefined */
  settings: AppSettings | undefined;
}

/** usePresets が返す値 */
export interface UsePresetsReturn {
  /** 選択中のスタイルの、保存前の表示設定 */
  draftDisplaySettings: DashboardDisplaySettings;
  /** 画面に並べるスタイルの一覧（保存値の変更に追従する） */
  draftPresets: DashboardPreset[];
  /** 選択中のスタイルの ID。スタイルが無い・選択中のものが消えたときは null */
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
  /** 保存・適用・削除を background が拒んだときの文言。失敗していなければ null */
  presetError: string | null;
  /** 作成を background が拒んだときの文言（新規作成モーダルに出す）。失敗していなければ null */
  createPresetError: string | null;
  /** 新規作成モーダルを開閉する（作成の失敗の文言は消える） */
  setShowSavePresetModal: (show: boolean) => void;
  /** 新規作成モーダルの名前の入力を変える（作成の失敗の文言は消える） */
  setPresetName: (name: string) => void;
  /** presetId のスタイルを選択し、下書きをその表示設定にする（保存していない変更は捨てる） */
  handleSelectPreset: (presetId: string) => void;
  /** 選択中のスタイルの名前の下書きを変える */
  handlePresetNameChange: (name: string) => void;
  /** スケジュールが参照していれば確認待ちにし、参照が無ければすぐ削除を依頼する */
  handleRequestDeletePreset: (id: string) => Promise<void>;
  /** 確認待ちのスタイルの削除を background に依頼する（参照していたスケジュールからは background が外す） */
  handleConfirmDeletePreset: () => Promise<void>;
  /** 削除の確認待ちを取り消す */
  handleCancelDeletePreset: () => void;
  /** 下書きで選択中のスタイルの置き換えを background に依頼する。目標文か名前が空白だけなら何もしない */
  handleSaveSelectedPreset: () => Promise<void>;
  /** 選択中のスタイルをダッシュボードに表示するスタイルにするよう background に依頼する */
  handleApplyPreset: () => Promise<void>;
  /** presetName の名前でスタイルの作成を background に依頼し、作れたら選択する。名前が空白だけなら何もしない */
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

interface PresetDraft {
  presetId: string;
  base: DashboardPreset;
  name: string;
  display: DashboardDisplaySettings;
  isDirty: boolean;
}

interface PresetState {
  initialized: boolean;
  selectedPresetId: string | null;
  draft: PresetDraft | null;
  visionSaved: boolean;
  showSavePresetModal: boolean;
  presetName: string;
  deleteTargetPresetId: string | null;
  presetError: string | null;
  createPresetError: string | null;
}

type PresetAction =
  | { type: 'INITIALIZE'; presetId: string }
  | { type: 'SELECT_PRESET'; presetId: string }
  | {
      type: 'EDIT';
      base: DashboardPreset;
      name?: string;
      display?: Partial<DashboardDisplaySettings>;
    }
  | { type: 'SAVED'; presetId: string }
  | { type: 'CREATED'; presetId: string }
  | { type: 'DELETED'; presetId: string }
  | { type: 'FAILED'; error: string }
  | { type: 'CREATE_FAILED'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_VISION_SAVED'; saved: boolean }
  | { type: 'SET_SHOW_MODAL'; show: boolean }
  | { type: 'SET_PRESET_NAME'; name: string }
  | { type: 'REQUEST_DELETE_PRESET'; presetId: string }
  | { type: 'CLEAR_DELETE_TARGET' };

const INITIAL_STATE: PresetState = {
  initialized: false,
  selectedPresetId: null,
  draft: null,
  visionSaved: false,
  showSavePresetModal: false,
  presetName: '',
  deleteTargetPresetId: null,
  presetError: null,
  createPresetError: null
};

function draftFor(
  draft: PresetDraft | null,
  preset: DashboardPreset | undefined
): PresetDraft | null {
  if (!draft || !preset || draft.presetId !== preset.id) return null;
  return draft.isDirty || draft.base === preset ? draft : null;
}

function initialSelection(vision: VisionSettings | undefined): string | null {
  if (!vision) return null;
  const target =
    vision.presets.find((p) => p.id === vision.activePresetId) ??
    vision.presets[0];
  return target?.id ?? null;
}

function presetReducer(state: PresetState, action: PresetAction): PresetState {
  switch (action.type) {
    case 'INITIALIZE':
      if (state.initialized) return state;
      return {
        ...state,
        initialized: true,
        selectedPresetId: action.presetId
      };
    case 'SELECT_PRESET':
      return {
        ...state,
        initialized: true,
        selectedPresetId: action.presetId,
        draft: null,
        presetError: null
      };
    case 'EDIT': {
      const current = draftFor(state.draft, action.base);
      return {
        ...state,
        presetError: null,
        draft: {
          presetId: action.base.id,
          base: action.base,
          name: action.name ?? current?.name ?? action.base.name,
          display: {
            ...(current?.display ?? presetToDisplaySettings(action.base)),
            ...action.display
          },
          isDirty: true
        }
      };
    }
    case 'SAVED':
      if (state.draft?.presetId !== action.presetId) return state;
      return { ...state, draft: { ...state.draft, isDirty: false } };
    case 'CREATED':
      return {
        ...state,
        initialized: true,
        selectedPresetId: action.presetId,
        draft: null,
        showSavePresetModal: false,
        presetName: '',
        createPresetError: null
      };
    case 'DELETED': {
      const wasSelected = state.selectedPresetId === action.presetId;
      return {
        ...state,
        selectedPresetId: wasSelected ? null : state.selectedPresetId,
        draft: wasSelected ? null : state.draft,
        deleteTargetPresetId: null
      };
    }
    case 'FAILED':
      return {
        ...state,
        presetError: action.error,
        deleteTargetPresetId: null
      };
    case 'CREATE_FAILED':
      return { ...state, createPresetError: action.error };
    case 'CLEAR_ERROR':
      return { ...state, presetError: null };
    case 'SET_VISION_SAVED':
      return { ...state, visionSaved: action.saved };
    case 'SET_SHOW_MODAL':
      return {
        ...state,
        showSavePresetModal: action.show,
        createPresetError: null
      };
    case 'SET_PRESET_NAME':
      return { ...state, presetName: action.name, createPresetError: null };
    case 'REQUEST_DELETE_PRESET':
      return { ...state, deleteTargetPresetId: action.presetId };
    case 'CLEAR_DELETE_TARGET':
      return { ...state, deleteTargetPresetId: null };
  }
}

interface PresetResponse {
  success: boolean;
  id?: string;
  error?: MessageError;
}

async function requestPreset(
  send: () => Promise<PresetResponse>
): Promise<PresetResponse> {
  try {
    return await send();
  } catch {
    return { success: false };
  }
}

const SAVED_FEEDBACK_MS = STATUS_RESET_DELAY_MS;

const NO_PRESETS: DashboardPreset[] = [];

/**
 * スタイル編集画面の下書きと、スタイルの選択・保存・適用・作成・削除を background へ依頼する操作を提供する（一覧は保存値の購読で追従し、選択中のスタイルの保存していない変更は保つ）
 * @param options フックの入力（下記の項目）
 * @param options.vision 保存済みのダッシュボードの設定。読み込み前は undefined
 * @param options.settings 今のアプリ設定。読み込み前は undefined
 * @returns 下書きの状態と、スタイルと下書きへの各操作
 */
export function usePresets({
  vision,
  settings
}: UsePresetsOptions): UsePresetsReturn {
  const [state, dispatch] = useReducer(presetReducer, INITIAL_STATE);

  useEffect(() => {
    const presetId = initialSelection(vision);
    if (state.initialized || presetId === null) return;
    dispatch({ type: 'INITIALIZE', presetId });
  }, [vision, state.initialized]);

  const presets = vision?.presets ?? NO_PRESETS;
  const selectedId = state.initialized
    ? state.selectedPresetId
    : initialSelection(vision);
  const selectedPreset = presets.find((p) => p.id === selectedId);
  const activeDraft = draftFor(state.draft, selectedPreset);

  const draftDisplaySettings = useMemo(() => {
    if (activeDraft) return activeDraft.display;
    if (selectedPreset) return presetToDisplaySettings(selectedPreset);
    return vision?.defaultSettings ?? DEFAULT_DISPLAY_SETTINGS;
  }, [activeDraft, selectedPreset, vision]);
  const editingPresetName = activeDraft?.name ?? selectedPreset?.name ?? '';

  const { fontSettings: currentFontSettings } = draftDisplaySettings;
  useEffect(() => {
    if (!currentFontSettings) return;
    const fontDef = getFontDefinition(currentFontSettings.family);
    if (fontDef.googleFont) loadGoogleFont(fontDef.googleFont);
  }, [currentFontSettings]);

  const displayHandlers = useMemo(() => {
    const edit = (patch: {
      name?: string;
      display?: Partial<DashboardDisplaySettings>;
    }) => {
      if (!selectedPreset) return;
      dispatch({ type: 'EDIT', base: selectedPreset, ...patch });
    };
    return {
      handleGoalTextChange: (text: string) =>
        edit({ display: { goalText: text } }),
      handleGoalSubTextChange: (text: string) =>
        edit({ display: { goalSubText: text } }),
      handleTextColorChange: (color: string) =>
        edit({ display: { textColor: color } }),
      handleBackgroundTypeChange: (type: 'image' | 'color') =>
        edit({ display: { backgroundType: type } }),
      handleBackgroundChange: (bgId: string) =>
        edit({ display: { backgroundImage: bgId } }),
      handleBackgroundColorChange: (color: string) =>
        edit({ display: { backgroundColor: color } }),
      handleCustomBackgroundChange: (dataUrl: string | null) =>
        edit({ display: { customBackgroundData: dataUrl } }),
      handleFontSettingsChange: (fontSettings: FontSettings) =>
        edit({ display: { fontSettings } }),
      handlePresetNameChange: (name: string) => edit({ name })
    };
  }, [selectedPreset]);

  const modalHandlers = useMemo(
    () => ({
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
      if (!presets.some((p) => p.id === presetId)) return;
      dispatch({ type: 'SELECT_PRESET', presetId });
    },
    [presets]
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

  const deletePreset = useCallback(async (id: string) => {
    dispatch({ type: 'CLEAR_ERROR' });
    const response = await requestPreset(() =>
      sendMessage('delete-preset', { id })
    );
    if (!response.success) {
      dispatch({ type: 'FAILED', error: messageErrorText(response.error) });
      return;
    }
    dispatch({ type: 'DELETED', presetId: id });
  }, []);

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
    if (
      !selectedPreset ||
      !draftDisplaySettings.goalText.trim() ||
      !editingPresetName.trim()
    )
      return;

    dispatch({ type: 'CLEAR_ERROR' });
    const response = await requestPreset(() =>
      sendMessage('update-preset', {
        id: selectedPreset.id,
        name: editingPresetName,
        display: draftDisplaySettings
      })
    );
    if (!response.success) {
      dispatch({ type: 'FAILED', error: messageErrorText(response.error) });
      return;
    }
    dispatch({ type: 'SAVED', presetId: selectedPreset.id });
    showSavedFeedback();
  }, [
    selectedPreset,
    draftDisplaySettings,
    editingPresetName,
    showSavedFeedback
  ]);

  const handleApplyPreset = useCallback(async () => {
    if (!selectedPreset) return;
    dispatch({ type: 'CLEAR_ERROR' });
    const response = await requestPreset(() =>
      sendMessage('apply-preset', { id: selectedPreset.id })
    );
    if (!response.success) {
      dispatch({ type: 'FAILED', error: messageErrorText(response.error) });
      return;
    }
    showSavedFeedback();
    trackFeatureUse('preset_switch');
  }, [selectedPreset, showSavedFeedback]);

  const handleCreatePreset = useCallback(async () => {
    if (!state.presetName.trim()) return;
    const response = await requestPreset(() =>
      sendMessage('create-preset', { name: state.presetName })
    );
    if (!response.success || !response.id) {
      dispatch({
        type: 'CREATE_FAILED',
        error: messageErrorText(response.error)
      });
      return;
    }
    dispatch({ type: 'CREATED', presetId: response.id });
    trackFeatureUse('preset_create');
  }, [state.presetName]);

  return {
    draftDisplaySettings,
    draftPresets: presets,
    selectedPresetId: selectedPreset?.id ?? null,
    editingPresetName,
    isDirty: activeDraft?.isDirty ?? false,
    visionSaved: state.visionSaved,
    showSavePresetModal: state.showSavePresetModal,
    presetName: state.presetName,
    deleteTargetPresetId: state.deleteTargetPresetId,
    deleteTargetScheduleCount,
    presetError: state.presetError,
    createPresetError: state.createPresetError,
    ...displayHandlers,
    ...modalHandlers,
    handleSelectPreset,
    handleRequestDeletePreset,
    handleConfirmDeletePreset,
    handleCancelDeletePreset,
    handleSaveSelectedPreset,
    handleApplyPreset,
    handleCreatePreset
  };
}
