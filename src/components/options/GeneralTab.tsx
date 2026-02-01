import React from 'react';
import { Check, Lock, Plus, Save, Target, Trash2 } from 'lucide-react';

import { Button, Card, Input } from '~/components/ui';
import {
  UpgradePrompt,
  ImageUploader,
  FontPicker
} from '~/components/features';
import { getMessage } from '~/lib/i18n';
import { BACKGROUND_OPTIONS, getBackgroundUrl } from '~/constants/backgrounds';
import { FONT_SIZE_PX, FONT_WEIGHT_VALUE } from '~/constants/fonts';
import type {
  VisionSettings,
  DashboardPreset,
  DashboardDisplaySettings,
  FontSettings,
  FeatureLimits
} from '~/types/storage';
import { DEFAULT_FONT_SETTINGS, getFontDefinition } from '~/types/storage';

interface GeneralTabProps {
  // Vision data
  vision: VisionSettings | undefined;
  draftPresets: DashboardPreset[];
  selectedPresetId: string | null;
  draftDisplaySettings: DashboardDisplaySettings;
  editingPresetName: string;
  isDirty: boolean;
  visionSaved: boolean;

  // Premium state
  isPremium: boolean;
  featureLimits: FeatureLimits;

  // Preset handlers
  onSelectPreset: (presetId: string) => void;
  onCreatePresetClick: () => void;
  onDeletePreset: (id: string) => void;
  onApplyPreset: () => void;
  onSavePreset: () => void;
  onPresetNameChange: (name: string) => void;

  // Display settings handlers
  onGoalTextChange: (text: string) => void;
  onGoalSubTextChange: (text: string) => void;
  onTextColorChange: (color: string) => void;
  onBackgroundTypeChange: (type: 'image' | 'color') => void;
  onBackgroundChange: (bgId: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onCustomBackgroundChange: (dataUrl: string | null) => void;
  onFontSettingsChange: (fontSettings: FontSettings) => void;
}

export function GeneralTab({
  vision,
  draftPresets,
  selectedPresetId,
  draftDisplaySettings,
  editingPresetName,
  isDirty,
  visionSaved,
  isPremium,
  featureLimits,
  onSelectPreset,
  onCreatePresetClick,
  onDeletePreset,
  onApplyPreset,
  onSavePreset,
  onPresetNameChange,
  onGoalTextChange,
  onGoalSubTextChange,
  onTextColorChange,
  onBackgroundTypeChange,
  onBackgroundChange,
  onBackgroundColorChange,
  onCustomBackgroundChange,
  onFontSettingsChange
}: GeneralTabProps) {
  const selectedPreset = draftPresets.find((p) => p.id === selectedPresetId);

  // Determine if we're in editing mode
  const isEditing = !!selectedPresetId;

  return (
    <div
      className={`grid grid-cols-1 ${isEditing ? 'lg:grid-cols-5' : ''} gap-6`}
    >
      {/* Left Column - Settings */}
      <div className={`${isEditing ? 'lg:col-span-3' : ''} space-y-6`}>
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
              <Button onClick={onCreatePresetClick} size="sm">
                <Plus className="w-4 h-4" />
                {getMessage('createFirstPreset')}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {/* Preset buttons */}
                {draftPresets.map((preset, index) => {
                  const isActive = vision?.activePresetId === preset.id;
                  const isSelected = selectedPresetId === preset.id;
                  const isLocked =
                    !isPremium && index >= featureLimits.maxPresets;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => !isLocked && onSelectPreset(preset.id)}
                      disabled={isLocked}
                      title={
                        isLocked ? getMessage('upgradeToUsePreset') : undefined
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isLocked
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isSelected
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isLocked && (
                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                      )}
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
                    onClick={onCreatePresetClick}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {getMessage('newPreset')}
                  </button>
                )}
              </div>

              {!isPremium &&
                draftPresets.length >= featureLimits.maxPresets && (
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
                    <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{getMessage('lockedPresetWarning')}</span>
                  </div>
                )}
            </>
          )}
        </Card>

        {/* Editing indicator and action buttons */}
        {selectedPreset && (
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
        )}

        {/* Goal Settings - Only shown when editing a preset */}
        {selectedPresetId && (
          <>
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-600" />
                  {getMessage('goalSettings')}
                </div>
              </h2>
              <div className="space-y-4">
                {/* Preset Name (only when editing a preset) */}
                {selectedPreset && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {getMessage('presetName')}
                    </label>
                    <Input
                      value={editingPresetName}
                      onChange={onPresetNameChange}
                      placeholder={getMessage('presetNamePlaceholder')}
                    />
                  </div>
                )}

                {/* Main Goal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {getMessage('yourGoal')}
                  </label>
                  <Input
                    value={draftDisplaySettings.goalText}
                    onChange={onGoalTextChange}
                    placeholder={getMessage('goalPlaceholder')}
                  />
                </div>

                {/* Sub-message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {getMessage('goalSubText')}
                  </label>
                  <textarea
                    value={draftDisplaySettings.goalSubText}
                    onChange={(e) => onGoalSubTextChange(e.target.value)}
                    placeholder={getMessage('goalSubTextPlaceholder')}
                    maxLength={100}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {draftDisplaySettings.goalSubText.length} / 100
                  </p>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getMessage('textColor')}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={draftDisplaySettings.textColor}
                      onChange={(e) => onTextColorChange(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={draftDisplaySettings.textColor}
                      onChange={(e) => onTextColorChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono w-28"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Background Settings */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getMessage('dashboardBackground')}
              </h2>

              {/* Background Type Toggle */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getMessage('backgroundType')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onBackgroundTypeChange('image')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (draftDisplaySettings.backgroundType || 'image') ===
                      'image'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getMessage('backgroundTypeImage')}
                  </button>
                  <button
                    onClick={() => onBackgroundTypeChange('color')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      draftDisplaySettings.backgroundType === 'color'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getMessage('backgroundTypeColor')}
                  </button>
                </div>
              </div>

              {/* Image Selection */}
              {(draftDisplaySettings.backgroundType || 'image') === 'image' && (
                <div className="grid grid-cols-3 gap-4">
                  {BACKGROUND_OPTIONS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => onBackgroundChange(bg.id)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-colors ${
                        draftDisplaySettings.backgroundImage === bg.id
                          ? 'border-blue-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={getBackgroundUrl(bg.id)}
                        alt={bg.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-2 py-0.5 rounded">
                        {bg.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Color Selection */}
              {draftDisplaySettings.backgroundType === 'color' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getMessage('selectColor')}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={draftDisplaySettings.backgroundColor}
                      onChange={(e) => onBackgroundColorChange(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={draftDisplaySettings.backgroundColor}
                      onChange={(e) => onBackgroundColorChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono w-28"
                      placeholder="#1a1a2e"
                    />
                  </div>
                </div>
              )}

              {/* Custom Background Upload (Premium) */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    {getMessage('customBackground')}
                  </h3>
                  {!isPremium && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      {getMessage('premium')}
                    </span>
                  )}
                </div>
                {isPremium ? (
                  <ImageUploader
                    value={draftDisplaySettings.customBackgroundData || null}
                    onChange={onCustomBackgroundChange}
                  />
                ) : (
                  <UpgradePrompt
                    variant="inline"
                    limitType="customBackground"
                  />
                )}
              </div>
            </Card>

            {/* Font Customization */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getMessage('fontCustomization')}
              </h2>
              <FontPicker
                value={
                  draftDisplaySettings.fontSettings || DEFAULT_FONT_SETTINGS
                }
                onChange={onFontSettingsChange}
                previewText={
                  draftDisplaySettings.goalText || getMessage('goalPlaceholder')
                }
              />
            </Card>
          </>
        )}
      </div>

      {/* Right Column - Preview (sticky) - Only shown when editing */}
      {selectedPresetId && (
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getMessage('dashboardPreview')}
              </h2>
              <div
                className="relative aspect-video rounded-lg overflow-hidden"
                style={
                  draftDisplaySettings.backgroundType === 'color'
                    ? { backgroundColor: draftDisplaySettings.backgroundColor }
                    : draftDisplaySettings.customBackgroundData
                      ? {
                          backgroundImage: `url(${draftDisplaySettings.customBackgroundData})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }
                      : {
                          backgroundImage: `url(${getBackgroundUrl(
                            draftDisplaySettings.backgroundImage || 'default-1'
                          )})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }
                }
              >
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                  <p
                    className="text-center drop-shadow-lg"
                    style={{
                      color: draftDisplaySettings.textColor,
                      fontFamily: getFontDefinition(
                        draftDisplaySettings.fontSettings?.family || 'system'
                      ).css,
                      fontSize: `${
                        FONT_SIZE_PX[
                          draftDisplaySettings.fontSettings?.size || 'md'
                        ]
                      }px`,
                      fontWeight:
                        FONT_WEIGHT_VALUE[
                          draftDisplaySettings.fontSettings?.weight || 'bold'
                        ]
                    }}
                  >
                    {draftDisplaySettings.goalText ||
                      'Your goal will appear here'}
                  </p>
                  {draftDisplaySettings.goalSubText && (
                    <p
                      className="text-sm text-center drop-shadow-lg mt-2 opacity-80 whitespace-pre-line"
                      style={{ color: draftDisplaySettings.textColor }}
                    >
                      {draftDisplaySettings.goalSubText}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <div className="bg-white/90 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-amber-500">
                        {getMessage('todayBlocks')}
                      </p>
                      <p className="text-sm font-bold text-amber-600">0</p>
                    </div>
                    <div className="bg-white/90 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-blue-500">
                        {getMessage('blockingDays')}
                      </p>
                      <p className="text-sm font-bold text-blue-600">
                        {getMessage('blockedForDays', '1')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
