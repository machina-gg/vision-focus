import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { trackFeatureUse } from '~/lib/analytics';
import { storage } from '~/lib/storage';
import { presetToDisplaySettings } from '~/lib/presetUtils';
import { loadGoogleFont } from '~/constants/fonts';
import { STATUS_RESET_DELAY_MS } from '~/constants/intervals';
import type {
  VisionSettings,
  DashboardPreset,
  DashboardDisplaySettings
} from '~/types/storage';
import type { FontSettings } from '~/types/font';
import { DEFAULT_FONT_SETTINGS, getFontDefinition } from '~/types/font';
import { DEFAULT_VISION, DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

interface UsePresetsOptions {
  vision: VisionSettings | undefined;
  setVision: (vision: VisionSettings) => void;
}

export interface UsePresetsReturn {
  draftDisplaySettings: DashboardDisplaySettings;
  draftPresets: DashboardPreset[];
  selectedPresetId: string | null;
  editingPresetName: string;
  isDirty: boolean;
  visionSaved: boolean;
  showSavePresetModal: boolean;
  presetName: string;
  setShowSavePresetModal: (show: boolean) => void;
  setPresetName: (name: string) => void;
  handleSelectPreset: (presetId: string) => void;
  handlePresetNameChange: (name: string) => void;
  handleDeletePreset: (id: string) => Promise<void>;
  handleSaveSelectedPreset: () => Promise<void>;
  handleApplyPreset: () => Promise<void>;
  handleCreatePreset: () => Promise<void>;
  handleGoalTextChange: (text: string) => void;
  handleGoalSubTextChange: (text: string) => void;
  handleTextColorChange: (color: string) => void;
  handleBackgroundTypeChange: (type: 'image' | 'color') => void;
  handleBackgroundChange: (bgId: string) => void;
  handleBackgroundColorChange: (color: string) => void;
  handleCustomBackgroundChange: (dataUrl: string | null) => void;
  handleFontSettingsChange: (fontSettings: FontSettings) => void;
}

// ============ Reducer ============

interface PresetState {
  draftDisplaySettings: DashboardDisplaySettings;
  draftPresets: DashboardPreset[];
  selectedPresetId: string | null;
  editingPresetName: string;
  isDirty: boolean;
  visionSaved: boolean;
  showSavePresetModal: boolean;
  presetName: string;
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
  | { type: 'SET_PRESET_NAME'; name: string };

const INITIAL_STATE: PresetState = {
  draftDisplaySettings: DEFAULT_DISPLAY_SETTINGS,
  draftPresets: [],
  selectedPresetId: null,
  editingPresetName: '',
  isDirty: false,
  visionSaved: false,
  showSavePresetModal: false,
  presetName: ''
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
        isDirty: false
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
  }
}

// ============ Hook ============

const SAVED_FEEDBACK_MS = STATUS_RESET_DELAY_MS;

export function usePresets({
  vision,
  setVision
}: UsePresetsOptions): UsePresetsReturn {
  const [state, dispatch] = useReducer(presetReducer, INITIAL_STATE);

  useEffect(() => {
    const initialize = async () => {
      const storedVision = (await storage.get('vision')) as
        | VisionSettings
        | undefined;
      const visionData = storedVision || DEFAULT_VISION;
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

  // Display settings handlers -- dispatch is stable so no deps needed
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

  const showSavedFeedback = useCallback(() => {
    dispatch({ type: 'SET_VISION_SAVED', saved: true });
    setTimeout(
      () => dispatch({ type: 'SET_VISION_SAVED', saved: false }),
      SAVED_FEEDBACK_MS
    );
  }, []);

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

  const handleDeletePreset = useCallback(
    async (id: string) => {
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
      await storage.set('vision', toSave);
      setVision(toSave);
    },
    [state.draftPresets, state.selectedPresetId, vision, setVision]
  );

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
    await storage.set('vision', toSave);
    setVision(toSave);
    showSavedFeedback();
  }, [state, vision, setVision, showSavedFeedback]);

  const handleApplyPreset = useCallback(async () => {
    if (!state.selectedPresetId || !vision) return;
    const toSave: VisionSettings = {
      ...vision,
      activePresetId: state.selectedPresetId
    };
    await storage.set('vision', toSave);
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
    await storage.set('vision', toSave);
    setVision(toSave);
    trackFeatureUse('preset_create');
  }, [state.presetName, state.draftPresets, vision, setVision]);

  return {
    ...state,
    ...displayHandlers,
    handleSelectPreset,
    handleDeletePreset,
    handleSaveSelectedPreset,
    handleApplyPreset,
    handleCreatePreset
  };
}
