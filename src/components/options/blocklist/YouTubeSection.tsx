import React, { useCallback } from 'react';
import {
  Youtube,
  ShieldBan,
  PlaySquare,
  ThumbsUp,
  MessageSquare,
  LayoutPanelLeft,
  Home,
  Info
} from 'lucide-react';

import { Card, Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { YouTubeFeatureToggle } from './YouTubeFeatureToggle';
import type { YouTubeSettings } from '~/types/storage';

interface YouTubeSectionProps {
  youtube: YouTubeSettings;
  onYouTubeChange: (youtube: YouTubeSettings) => void;
}

export function YouTubeSection({
  youtube,
  onYouTubeChange
}: YouTubeSectionProps) {
  const isEnabled = youtube?.enabled ?? false;

  const handleToggle = useCallback(
    (key: keyof YouTubeSettings) => (checked: boolean) => {
      onYouTubeChange({ ...youtube, [key]: checked });
    },
    [youtube, onYouTubeChange]
  );

  const features = [
    {
      key: 'hideShorts' as const,
      icon: <PlaySquare className="w-4 h-4" />,
      title: getMessage('youtubeHideShorts'),
      description: getMessage('youtubeHideShortsDescription')
    },
    {
      key: 'hideRecommendations' as const,
      icon: <ThumbsUp className="w-4 h-4" />,
      title: getMessage('youtubeHideRecommendations'),
      description: getMessage('youtubeHideRecommendationsDescription')
    },
    {
      key: 'hideComments' as const,
      icon: <MessageSquare className="w-4 h-4" />,
      title: getMessage('youtubeHideComments'),
      description: getMessage('youtubeHideCommentsDescription')
    },
    {
      key: 'hideSidebar' as const,
      icon: <LayoutPanelLeft className="w-4 h-4" />,
      title: getMessage('youtubeHideSidebar'),
      description: getMessage('youtubeHideSidebarDescription')
    },
    {
      key: 'hideHomeFeed' as const,
      icon: <Home className="w-4 h-4" />,
      title: getMessage('youtubeHideHomeFeed'),
      description: getMessage('youtubeHideHomeFeedDescription')
    }
  ];

  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-danger-100 rounded-lg">
          <Youtube className="w-5 h-5 text-danger-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">
            {getMessage('youtubeBlockingTitle')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {getMessage('youtubeBlockingDescription')}
          </p>
        </div>
      </div>

      {/* Master Toggle */}
      <div className="p-3 bg-gray-50 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">
              {getMessage('youtubeEnabled')}
            </h3>
            <p className="text-xs text-gray-500">
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

      {/* Block Access Toggle */}
      {isEnabled && (
        <div className="mb-4">
          <YouTubeFeatureToggle
            icon={<ShieldBan className="w-4 h-4" />}
            title={getMessage('youtubeBlockAccess')}
            description={getMessage('youtubeBlockAccessDescription')}
            checked={youtube?.blockAccess ?? false}
            onChange={handleToggle('blockAccess')}
            disabled={!isEnabled}
          />
        </div>
      )}

      {/* Feature Toggles */}
      {!isEnabled && (
        <div className="mb-3 p-2 bg-block-50 border border-block-200 rounded-lg flex items-center gap-2">
          <Info className="w-4 h-4 text-block-600 flex-shrink-0" />
          <p className="text-xs text-block-700">
            {getMessage('youtubeDisabledNote')}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {features.map((feature) => (
          <YouTubeFeatureToggle
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
  );
}
