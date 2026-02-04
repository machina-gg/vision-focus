import React, { useCallback } from 'react';
import {
  Youtube,
  PlaySquare,
  ThumbsUp,
  MessageSquare,
  LayoutPanelLeft,
  Home,
  Info
} from 'lucide-react';

import { Card, Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { YouTubeSettings } from '~/types/storage';

interface YouTubeTabProps {
  youtube: YouTubeSettings | undefined;
  onYouTubeChange: (youtube: YouTubeSettings) => void;
}

interface FeatureToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function FeatureToggle({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false
}: FeatureToggleProps) {
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
        disabled
          ? 'bg-gray-50 opacity-60'
          : checked
            ? 'bg-blue-50'
            : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div
        className={`p-2 rounded-lg ${checked && !disabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3
            className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {title}
          </h3>
          <Toggle
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            size="sm"
          />
        </div>
        <p
          className={`text-sm mt-1 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export function YouTubeTab({ youtube, onYouTubeChange }: YouTubeTabProps) {
  const isEnabled = youtube?.enabled ?? false;

  const handleToggle = useCallback(
    (key: keyof YouTubeSettings) => (checked: boolean) => {
      if (!youtube) return;
      onYouTubeChange({ ...youtube, [key]: checked });
    },
    [youtube, onYouTubeChange]
  );

  const features = [
    {
      key: 'hideShorts' as const,
      icon: <PlaySquare className="w-5 h-5" />,
      title: getMessage('youtubeHideShorts'),
      description: getMessage('youtubeHideShortsDescription')
    },
    {
      key: 'hideRecommendations' as const,
      icon: <ThumbsUp className="w-5 h-5" />,
      title: getMessage('youtubeHideRecommendations'),
      description: getMessage('youtubeHideRecommendationsDescription')
    },
    {
      key: 'hideComments' as const,
      icon: <MessageSquare className="w-5 h-5" />,
      title: getMessage('youtubeHideComments'),
      description: getMessage('youtubeHideCommentsDescription')
    },
    {
      key: 'hideSidebar' as const,
      icon: <LayoutPanelLeft className="w-5 h-5" />,
      title: getMessage('youtubeHideSidebar'),
      description: getMessage('youtubeHideSidebarDescription')
    },
    {
      key: 'hideHomeFeed' as const,
      icon: <Home className="w-5 h-5" />,
      title: getMessage('youtubeHideHomeFeed'),
      description: getMessage('youtubeHideHomeFeedDescription')
    }
  ];

  const activeFeatures = features.filter(
    (f) => youtube?.[f.key as keyof YouTubeSettings]
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <Youtube className="w-8 h-8 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {getMessage('youtubeBlockingTitle')}
            </h2>
            <p className="text-gray-500 mt-1">
              {getMessage('youtubeBlockingDescription')}
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">
                {getMessage('youtubeEnabled')}
              </h3>
              <p className="text-sm text-gray-500">
                {getMessage('youtubeEnabledDescription')}
              </p>
            </div>
            <Toggle
              checked={isEnabled}
              onChange={handleToggle('enabled')}
              size="lg"
            />
          </div>
        </div>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {getMessage('youtubePreviewTitle')}
        </h2>

        {!isEnabled && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              {getMessage('youtubeDisabledNote')}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {features.map((feature) => (
            <FeatureToggle
              key={feature.key}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              checked={youtube?.[feature.key] ?? false}
              onChange={handleToggle(feature.key)}
              disabled={!isEnabled}
            />
          ))}
        </div>
      </Card>

      {/* Active Features Summary */}
      {isEnabled && activeFeatures.length > 0 && (
        <Card>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {getMessage('active')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeFeatures.map((feature) => (
              <span
                key={feature.key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-full"
              >
                {React.cloneElement(feature.icon as React.ReactElement, {
                  className: 'w-4 h-4'
                })}
                {feature.title}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
