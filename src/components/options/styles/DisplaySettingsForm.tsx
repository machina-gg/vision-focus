import React from 'react';
import { Target } from 'lucide-react';

import { Card, Input } from '~/components/ui';
import {
  UpgradePrompt,
  ImageUploader,
  FontPicker
} from '~/components/features';
import { getMessage } from '~/lib/i18n';
import { BACKGROUND_OPTIONS, getBackgroundUrl } from '~/constants/backgrounds';
import type { DashboardPreset } from '~/types/storage';
import { DEFAULT_FONT_SETTINGS } from '~/types/font';
import type { UsePresetsReturn } from '~/hooks/usePresets';

interface DisplaySettingsFormProps {
  presets: UsePresetsReturn;
  isPremium: boolean;
}

export function DisplaySettingsForm({
  presets,
  isPremium
}: DisplaySettingsFormProps) {
  const {
    draftDisplaySettings,
    selectedPresetId,
    draftPresets,
    editingPresetName,
    handlePresetNameChange,
    handleGoalTextChange,
    handleGoalSubTextChange,
    handleTextColorChange,
    handleBackgroundTypeChange,
    handleBackgroundChange,
    handleBackgroundColorChange,
    handleCustomBackgroundChange,
    handleFontSettingsChange
  } = presets;

  const selectedPreset: DashboardPreset | undefined = draftPresets.find(
    (p) => p.id === selectedPresetId
  );

  if (!selectedPresetId) {
    return null;
  }

  return (
    <>
      {/* Goal Settings */}
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
                onChange={handlePresetNameChange}
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
              onChange={handleGoalTextChange}
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
              onChange={(e) => handleGoalSubTextChange(e.target.value)}
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
                onChange={(e) => handleTextColorChange(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300"
              />
              <input
                type="text"
                value={draftDisplaySettings.textColor}
                onChange={(e) => handleTextColorChange(e.target.value)}
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
              onClick={() => handleBackgroundTypeChange('image')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (draftDisplaySettings.backgroundType || 'image') === 'image'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getMessage('backgroundTypeImage')}
            </button>
            <button
              onClick={() => handleBackgroundTypeChange('color')}
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
                onClick={() => handleBackgroundChange(bg.id)}
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
                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
              />
              <input
                type="text"
                value={draftDisplaySettings.backgroundColor}
                onChange={(e) => handleBackgroundColorChange(e.target.value)}
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
              onChange={handleCustomBackgroundChange}
            />
          ) : (
            <UpgradePrompt variant="inline" limitType="customBackground" />
          )}
        </div>
      </Card>

      {/* Font Customization */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {getMessage('fontCustomization')}
        </h2>
        <FontPicker
          value={draftDisplaySettings.fontSettings || DEFAULT_FONT_SETTINGS}
          onChange={handleFontSettingsChange}
          previewText={
            draftDisplaySettings.goalText || getMessage('goalPlaceholder')
          }
        />
      </Card>
    </>
  );
}
