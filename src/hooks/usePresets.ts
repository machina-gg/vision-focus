import { useCallback, useEffect, useState } from 'react';

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
  // State
  draftDisplaySettings: DashboardDisplaySettings;
  draftPresets: DashboardPreset[];
  selectedPresetId: string | null;
  editingPresetName: string;
  isDirty: boolean;
  visionSaved: boolean;
  showSavePresetModal: boolean;
  presetName: string;

  // Modal controls
  setShowSavePresetModal: (show: boolean) => void;
  setPresetName: (name: string) => void;

  // Preset handlers
  handleSelectPreset: (presetId: string) => void;
  handlePresetNameChange: (name: string) => void;
  handleDeletePreset: (id: string) => Promise<void>;
  handleSaveSelectedPreset: () => Promise<void>;
  handleApplyPreset: () => Promise<void>;
  handleCreatePreset: () => Promise<void>;

  // Display settings handlers
  handleGoalTextChange: (text: string) => void;
  handleGoalSubTextChange: (text: string) => void;
  handleTextColorChange: (color: string) => void;
  handleBackgroundTypeChange: (type: 'image' | 'color') => void;
  handleBackgroundChange: (bgId: string) => void;
  handleBackgroundColorChange: (color: string) => void;
  handleCustomBackgroundChange: (dataUrl: string | null) => void;
  handleFontSettingsChange: (fontSettings: FontSettings) => void;
}

export function usePresets({
  vision,
  setVision
}: UsePresetsOptions): UsePresetsReturn {
  // Draft display settings (for preview, saved on button click)
  const [draftDisplaySettings, setDraftDisplaySettings] =
    useState<DashboardDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [draftPresets, setDraftPresets] = useState<DashboardPreset[]>([]);
  const [visionSaved, setVisionSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Selected preset state
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Preset modal state
  const [presetName, setPresetName] = useState('');
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [editingPresetName, setEditingPresetName] = useState('');

  // Initialize from storage (run once on mount)
  useEffect(() => {
    const initialize = async () => {
      const storedVision = (await storage.get('vision')) as
        | VisionSettings
        | undefined;
      const visionData = storedVision || DEFAULT_VISION;

      const presets = visionData.presets || [];
      setDraftPresets(presets);

      if (presets.length > 0) {
        const activePreset = visionData.activePresetId
          ? presets.find((p) => p.id === visionData.activePresetId)
          : presets[0];
        const presetToSelect = activePreset || presets[0];
        setSelectedPresetId(presetToSelect.id);
        setEditingPresetName(presetToSelect.name);
        setDraftDisplaySettings(presetToDisplaySettings(presetToSelect));
      } else {
        setDraftDisplaySettings(
          visionData.defaultSettings || DEFAULT_DISPLAY_SETTINGS
        );
        setSelectedPresetId(null);
      }
    };

    initialize();
  }, []);

  // Load Google Font when fontSettings changes
  useEffect(() => {
    if (draftDisplaySettings.fontSettings) {
      const fontDef = getFontDefinition(
        draftDisplaySettings.fontSettings.family
      );
      if (fontDef.googleFont) {
        loadGoogleFont(fontDef.googleFont);
      }
    }
  }, [draftDisplaySettings.fontSettings]);

  // ============ Display Settings Handlers ============
  const handleGoalTextChange = useCallback((text: string) => {
    setDraftDisplaySettings((prev) => ({ ...prev, goalText: text }));
    setIsDirty(true);
  }, []);

  const handleGoalSubTextChange = useCallback((text: string) => {
    setDraftDisplaySettings((prev) => ({ ...prev, goalSubText: text }));
    setIsDirty(true);
  }, []);

  const handleTextColorChange = useCallback((color: string) => {
    setDraftDisplaySettings((prev) => ({ ...prev, textColor: color }));
    setIsDirty(true);
  }, []);

  const handleBackgroundChange = useCallback((bgId: string) => {
    setDraftDisplaySettings((prev) => ({ ...prev, backgroundImage: bgId }));
    setIsDirty(true);
  }, []);

  const handleBackgroundTypeChange = useCallback((type: 'image' | 'color') => {
    setDraftDisplaySettings((prev) => ({ ...prev, backgroundType: type }));
    setIsDirty(true);
  }, []);

  const handleBackgroundColorChange = useCallback((color: string) => {
    setDraftDisplaySettings((prev) => ({ ...prev, backgroundColor: color }));
    setIsDirty(true);
  }, []);

  const handleCustomBackgroundChange = useCallback((dataUrl: string | null) => {
    setDraftDisplaySettings((prev) => ({
      ...prev,
      customBackgroundData: dataUrl
    }));
    setIsDirty(true);
  }, []);

  const handleFontSettingsChange = useCallback((fontSettings: FontSettings) => {
    setDraftDisplaySettings((prev) => ({ ...prev, fontSettings }));
    setIsDirty(true);
  }, []);

  // ============ Preset Handlers ============
  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const preset = draftPresets.find((p) => p.id === presetId);
      if (preset) {
        setSelectedPresetId(presetId);
        setEditingPresetName(preset.name);
        setDraftDisplaySettings(presetToDisplaySettings(preset));
        setIsDirty(false);
      }
    },
    [draftPresets]
  );

  const handlePresetNameChange = useCallback((name: string) => {
    setEditingPresetName(name);
    setIsDirty(true);
  }, []);

  const handleDeletePreset = useCallback(
    async (id: string) => {
      const remainingPresets = draftPresets.filter((p) => p.id !== id);
      setDraftPresets(remainingPresets);

      if (id === selectedPresetId) {
        setSelectedPresetId(null);
        const storedVision = vision || DEFAULT_VISION;
        setDraftDisplaySettings(
          storedVision.defaultSettings || DEFAULT_DISPLAY_SETTINGS
        );
      }

      const toSave: VisionSettings = {
        defaultSettings: vision?.defaultSettings || DEFAULT_DISPLAY_SETTINGS,
        presets: remainingPresets,
        activePresetId:
          vision?.activePresetId === id ? null : vision?.activePresetId || null
      };

      await storage.set('vision', toSave);
      setVision(toSave);
      setIsDirty(false);
    },
    [draftPresets, selectedPresetId, vision, setVision]
  );

  const handleSaveSelectedPreset = useCallback(async () => {
    if (
      !selectedPresetId ||
      !draftDisplaySettings.goalText.trim() ||
      !editingPresetName.trim()
    )
      return;

    const updatedPresets = draftPresets.map((p) =>
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

    setDraftPresets(updatedPresets);

    const toSave: VisionSettings = {
      defaultSettings: vision?.defaultSettings || DEFAULT_DISPLAY_SETTINGS,
      presets: updatedPresets,
      activePresetId: vision?.activePresetId || null
    };

    await storage.set('vision', toSave);
    setVision(toSave);
    setIsDirty(false);
    setVisionSaved(true);
    setTimeout(() => setVisionSaved(false), STATUS_RESET_DELAY_MS);
  }, [
    selectedPresetId,
    draftDisplaySettings,
    draftPresets,
    editingPresetName,
    vision,
    setVision
  ]);

  const handleApplyPreset = useCallback(async () => {
    if (!selectedPresetId || !vision) return;

    const toSave: VisionSettings = {
      ...vision,
      activePresetId: selectedPresetId
    };
    await storage.set('vision', toSave);
    setVision(toSave);
    setVisionSaved(true);
    setTimeout(() => setVisionSaved(false), STATUS_RESET_DELAY_MS);
  }, [selectedPresetId, vision, setVision]);

  const handleCreatePreset = useCallback(async () => {
    if (!presetName.trim()) return;

    const newPreset: DashboardPreset = {
      id: crypto.randomUUID(),
      name: presetName.trim(),
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

    const updatedPresets = [...draftPresets, newPreset];
    setDraftPresets(updatedPresets);

    const toSave: VisionSettings = {
      defaultSettings: vision?.defaultSettings || DEFAULT_DISPLAY_SETTINGS,
      presets: updatedPresets,
      activePresetId: vision?.activePresetId || null
    };

    await storage.set('vision', toSave);
    setVision(toSave);

    setSelectedPresetId(newPreset.id);
    setEditingPresetName(newPreset.name);
    setDraftDisplaySettings(presetToDisplaySettings(newPreset));
    setShowSavePresetModal(false);
    setPresetName('');
    setIsDirty(false);
  }, [presetName, draftPresets, vision, setVision]);

  return {
    // State
    draftDisplaySettings,
    draftPresets,
    selectedPresetId,
    editingPresetName,
    isDirty,
    visionSaved,
    showSavePresetModal,
    presetName,

    // Modal controls
    setShowSavePresetModal,
    setPresetName,

    // Preset handlers
    handleSelectPreset,
    handlePresetNameChange,
    handleDeletePreset,
    handleSaveSelectedPreset,
    handleApplyPreset,
    handleCreatePreset,

    // Display settings handlers
    handleGoalTextChange,
    handleGoalSubTextChange,
    handleTextColorChange,
    handleBackgroundTypeChange,
    handleBackgroundChange,
    handleBackgroundColorChange,
    handleCustomBackgroundChange,
    handleFontSettingsChange
  };
}
