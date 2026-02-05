import React from 'react';
import { Check, Lock, Plus, Save, Target, Trash2 } from 'lucide-react';

import { Button, Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { VisionSettings, DashboardDisplaySettings } from '~/types/storage';
import type { FeatureLimits } from '~/types/premium';
import type { UsePresetsReturn } from '~/hooks/usePresets';

interface PresetSelectorProps {
  presets: UsePresetsReturn;
  vision: VisionSettings | undefined;
  isPremium: boolean;
  featureLimits: FeatureLimits;
}

export function PresetSelector({
  presets,
  vision,
  isPremium,
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
          <h2 className="text-lg font-semibold text-gray-900">
            {getMessage('dashboardPresets')}
          </h2>
          {!isPremium && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              {getMessage('premium')}
            </span>
          )}
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
              isPremium={isPremium}
              featureLimits={featureLimits}
              onSelectPreset={handleSelectPreset}
              onCreateClick={() => setShowSavePresetModal(true)}
            />

            {!isPremium && draftPresets.length >= featureLimits.maxPresets && (
              <p className="text-xs text-amber-600 mt-2">
                {getMessage(
                  'maxPresetsReached',
                  String(featureLimits.maxPresets)
                )}
              </p>
            )}

            {/* Warning if active preset is locked */}
            {!isPremium &&
              vision?.activePresetId &&
              draftPresets.findIndex((p) => p.id === vision.activePresetId) >=
                featureLimits.maxPresets && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mt-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>{getMessage('lockedPresetWarning')}</span>
                </div>
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
      <Button onClick={onCreateClick} size="sm">
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
  isPremium: boolean;
  featureLimits: FeatureLimits;
  onSelectPreset: (presetId: string) => void;
  onCreateClick: () => void;
}

function PresetButtons({
  draftPresets,
  vision,
  selectedPresetId,
  isPremium,
  featureLimits,
  onSelectPreset,
  onCreateClick
}: PresetButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {draftPresets.map((preset, index) => {
        const isActive = vision?.activePresetId === preset.id;
        const isSelected = selectedPresetId === preset.id;
        const isLocked = !isPremium && index >= featureLimits.maxPresets;
        return (
          <button
            key={preset.id}
            onClick={() => !isLocked && onSelectPreset(preset.id)}
            disabled={isLocked}
            title={isLocked ? getMessage('upgradeToUsePreset') : undefined}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              isLocked
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isSelected
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isLocked && <Lock className="w-3.5 h-3.5 text-gray-400" />}
            {!isLocked && isActive && (
              <Check
                className={`w-3.5 h-3.5 ${
                  isSelected ? 'text-white' : 'text-green-600'
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
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          {getMessage('editingPreset', selectedPreset.name)}
        </span>
        {isDirty && (
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            {getMessage('unsavedChanges')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeletePreset(selectedPreset.id)}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
        {vision?.activePresetId === selectedPresetId ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg">
            <Check className="w-4 h-4" />
            {getMessage('activePreset')}
          </span>
        ) : (
          <Button variant="secondary" onClick={onApplyPreset} size="sm">
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
        >
          <Save className="w-4 h-4" />
          {visionSaved ? getMessage('saved') : getMessage('save')}
        </Button>
      </div>
    </div>
  );
}
