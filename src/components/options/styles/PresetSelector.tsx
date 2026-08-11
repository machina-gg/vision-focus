import React from 'react';
import { Check, Plus, Save, Target, Trash2 } from 'lucide-react';

import { Button, Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { VisionSettings, DashboardDisplaySettings } from '~/types/storage';
import type { FeatureLimits } from '~/types/premium';
import type { UsePresetsReturn } from '~/hooks/usePresets';

interface PresetSelectorProps {
  presets: UsePresetsReturn;
  vision: VisionSettings | undefined;
  featureLimits: FeatureLimits;
}

export function PresetSelector({
  presets,
  vision,
  featureLimits
}: PresetSelectorProps) {
  const {
    draftPresets,
    selectedPresetId,
    draftDisplaySettings,
    editingPresetName,
    isDirty,
    visionSaved,
    setShowSavePresetModal,
    handleSelectPreset,
    handleDeletePreset,
    handleApplyPreset,
    handleSaveSelectedPreset
  } = presets;

  const selectedPreset = draftPresets.find((p) => p.id === selectedPresetId);

  return (
    <>
      {/* Preset Selector */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-semibold text-gray-900"
            data-testid="styles-section-heading"
          >
            {getMessage('dashboardPresets')}
          </h2>
        </div>

        {/* Empty state or Preset tabs */}
        {draftPresets.length === 0 ? (
          <EmptyState onCreateClick={() => setShowSavePresetModal(true)} />
        ) : (
          <>
            <PresetButtons
              draftPresets={draftPresets}
              vision={vision}
              selectedPresetId={selectedPresetId}
              featureLimits={featureLimits}
              onSelectPreset={handleSelectPreset}
              onCreateClick={() => setShowSavePresetModal(true)}
            />

            {draftPresets.length >= featureLimits.maxPresets && (
              <p className="text-xs text-gray-500 mt-2">
                {getMessage(
                  'maxPresetsReached',
                  String(featureLimits.maxPresets)
                )}
              </p>
            )}
          </>
        )}
      </Card>

      {/* Editing indicator and action buttons */}
      {selectedPreset && (
        <EditingIndicator
          selectedPreset={selectedPreset}
          selectedPresetId={selectedPresetId}
          isDirty={isDirty}
          visionSaved={visionSaved}
          draftDisplaySettings={draftDisplaySettings}
          editingPresetName={editingPresetName}
          vision={vision}
          onDeletePreset={handleDeletePreset}
          onApplyPreset={handleApplyPreset}
          onSavePreset={handleSaveSelectedPreset}
        />
      )}
    </>
  );
}

// --- Internal sub-components ---

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Target className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">
        {getMessage('noPresetsTitle')}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        {getMessage('noPresetsDescription')}
      </p>
      <Button
        onClick={onCreateClick}
        size="sm"
        data-testid="style-create-first-button"
      >
        <Plus className="w-4 h-4" />
        {getMessage('createFirstPreset')}
      </Button>
    </div>
  );
}

interface PresetButtonsProps {
  draftPresets: UsePresetsReturn['draftPresets'];
  vision: VisionSettings | undefined;
  selectedPresetId: string | null;
  featureLimits: FeatureLimits;
  onSelectPreset: (presetId: string) => void;
  onCreateClick: () => void;
}

function PresetButtons({
  draftPresets,
  vision,
  selectedPresetId,
  featureLimits,
  onSelectPreset,
  onCreateClick
}: PresetButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {draftPresets.map((preset) => {
        const isActive = vision?.activePresetId === preset.id;
        const isSelected = selectedPresetId === preset.id;
        return (
          <button
            key={preset.id}
            data-testid="style-preset-button"
            onClick={() => onSelectPreset(preset.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              isSelected
                ? 'bg-info-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isActive && (
              <Check
                className={`w-3.5 h-3.5 ${
                  isSelected ? 'text-white' : 'text-success-600'
                }`}
              />
            )}
            {preset.name}
          </button>
        );
      })}

      {/* New preset button */}
      {draftPresets.length < featureLimits.maxPresets && (
        <button
          data-testid="style-new-preset-button"
          onClick={onCreateClick}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          {getMessage('newPreset')}
        </button>
      )}
    </div>
  );
}

interface EditingIndicatorProps {
  selectedPreset: { id: string; name: string };
  selectedPresetId: string | null;
  isDirty: boolean;
  visionSaved: boolean;
  draftDisplaySettings: DashboardDisplaySettings;
  editingPresetName: string;
  vision: VisionSettings | undefined;
  onDeletePreset: (id: string) => Promise<void>;
  onApplyPreset: () => Promise<void>;
  onSavePreset: () => Promise<void>;
}

function EditingIndicator({
  selectedPreset,
  selectedPresetId,
  isDirty,
  visionSaved,
  draftDisplaySettings,
  editingPresetName,
  vision,
  onDeletePreset,
  onApplyPreset,
  onSavePreset
}: EditingIndicatorProps) {
  return (
    <div className="flex items-center justify-between bg-info-50 border border-info-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-info-600" />
        <span className="text-sm font-medium text-info-900">
          {getMessage('editingPreset', selectedPreset.name)}
        </span>
        {isDirty && (
          <span className="text-xs text-premium-600 bg-premium-100 px-2 py-0.5 rounded-full">
            {getMessage('unsavedChanges')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeletePreset(selectedPreset.id)}
          data-testid="style-delete-button"
        >
          <Trash2 className="w-4 h-4 text-danger-500" />
        </Button>
        {vision?.activePresetId === selectedPresetId ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-success-700 bg-success-100 rounded-lg">
            <Check className="w-4 h-4" />
            {getMessage('activePreset')}
          </span>
        ) : (
          <Button
            variant="secondary"
            onClick={onApplyPreset}
            size="sm"
            data-testid="style-apply-button"
          >
            <Check className="w-4 h-4" />
            {getMessage('applyPreset')}
          </Button>
        )}
        <Button
          onClick={onSavePreset}
          disabled={
            !draftDisplaySettings.goalText.trim() ||
            !editingPresetName.trim() ||
            !isDirty
          }
          size="sm"
          data-testid="style-save-button"
        >
          <Save className="w-4 h-4" />
          {visionSaved ? getMessage('saved') : getMessage('save')}
        </Button>
      </div>
    </div>
  );
}
