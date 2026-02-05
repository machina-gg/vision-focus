import React from 'react';

import { useStorage } from '@plasmohq/storage/hook';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { getBackgroundUrl } from '~/constants/backgrounds';
import { FONT_SIZE_PX, FONT_WEIGHT_VALUE } from '~/constants/fonts';
import { getFontDefinition } from '~/types/font';
import { usePresets } from '~/hooks';
import { storage } from '~/lib/storage';
import { NewPresetModal } from '~/components/options/modals';
import { PresetSelector, DisplaySettingsForm } from './styles';
import type { VisionSettings } from '~/types/storage';
import type { FeatureLimits } from '~/types/premium';
import { DEFAULT_VISION } from '~/types/storage';

interface StylesTabProps {
  isPremium: boolean;
  featureLimits: FeatureLimits;
}

export function StylesTab({ isPremium, featureLimits }: StylesTabProps) {
  const [vision, setVision] = useStorage<VisionSettings>(
    { key: 'vision', instance: storage },
    DEFAULT_VISION
  );

  const presets = usePresets({ vision, setVision });

  const { draftDisplaySettings, selectedPresetId } = presets;
  const isEditing = !!selectedPresetId;

  return (
    <div
      className={`grid grid-cols-1 ${isEditing ? 'lg:grid-cols-5' : ''} gap-6`}
    >
      {/* Left Column - Settings */}
      <div className={`${isEditing ? 'lg:col-span-3' : ''} space-y-6`}>
        <PresetSelector
          presets={presets}
          vision={vision}
          isPremium={isPremium}
          featureLimits={featureLimits}
        />

        <DisplaySettingsForm presets={presets} isPremium={isPremium} />
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
                    ? {
                        backgroundColor: draftDisplaySettings.backgroundColor
                      }
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

      {/* New Preset Modal */}
      <NewPresetModal
        isOpen={presets.showSavePresetModal}
        onClose={() => presets.setShowSavePresetModal(false)}
        presetName={presets.presetName}
        onPresetNameChange={presets.setPresetName}
        onCreate={presets.handleCreatePreset}
      />
    </div>
  );
}
