import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Youtube,
  ShieldBan,
  PlaySquare,
  ThumbsUp,
  MessageSquare,
  Home,
  Info,
  Clock,
  Check
} from 'lucide-react';

import { Card, Toggle, Select, Button } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { YouTubeFeatureToggle } from './YouTubeFeatureToggle';
import { TIME_LIMIT_CONFIG, roundToNearestPreset } from '~/constants/limits';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import type { UnblockRequest } from '~/hooks/useUnblockGuard';
import type { YouTubeSettingsInput } from '~/types/messageSchemas';
import type { TrackedSite } from '~/types/site';

interface YouTubeSectionProps {
  site: TrackedSite | null;
  onYouTubeChange: (youtube: YouTubeSettingsInput) => void;
  onRequestUnblock: (request: UnblockRequest) => void;
}

const UNBLOCK_GUARDED_KEYS: ReadonlySet<keyof YouTubeSettingsInput> = new Set([
  'enabled',
  'blockAccess'
]);

function settingsOf(site: TrackedSite | null): YouTubeSettingsInput {
  const features = site?.youtube ?? null;
  const blockAccess = site?.block?.enabled === true;
  return {
    enabled: features !== null || blockAccess,
    blockAccess,
    hideShorts: features?.hideShorts ?? false,
    hideRecommendations: features?.hideRecommendations ?? false,
    hideComments: features?.hideComments ?? false,
    hideHomeFeed: features?.hideHomeFeed ?? false,
    timeLimit: site?.block?.timeLimit ?? null
  };
}

const SAVED_FEEDBACK_DURATION_MS = 2000;

type LimitTypeOption = 'always' | 'daily';

export function YouTubeSection({
  site,
  onYouTubeChange,
  onRequestUnblock
}: YouTubeSectionProps) {
  const youtube = useMemo(() => settingsOf(site), [site]);
  const isEnabled = youtube.enabled;
  const blockAccessEnabled = youtube.blockAccess;

  const [showSaved, setShowSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const showSavedFeedback = useCallback(() => {
    setShowSaved(true);
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = setTimeout(() => {
      setShowSaved(false);
      savedTimerRef.current = null;
    }, SAVED_FEEDBACK_DURATION_MS);
  }, []);

  const currentType: LimitTypeOption = youtube.timeLimit
    ? youtube.timeLimit.type
    : 'always';

  const currentMinutes = youtube.timeLimit
    ? Math.floor(youtube.timeLimit.limitSeconds / 60)
    : TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60;

  const getInitialMinutes = () => {
    if (!youtube.timeLimit) {
      return TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60;
    }

    const existingMinutes = Math.floor(youtube.timeLimit.limitSeconds / 60);
    return roundToNearestPreset(existingMinutes);
  };

  const [selectedType, setSelectedType] =
    useState<LimitTypeOption>(currentType);
  const [minutes, setMinutes] = useState(getInitialMinutes());

  useEffect(() => {
    setSelectedType(currentType);
    setMinutes(currentMinutes);
  }, [currentType, currentMinutes]);

  const hasChanges =
    selectedType !== currentType ||
    (selectedType !== 'always' && minutes !== currentMinutes);

  const handleToggle = useCallback(
    (key: keyof YouTubeSettingsInput) => (checked: boolean) => {
      if (!checked && UNBLOCK_GUARDED_KEYS.has(key)) {
        onRequestUnblock({
          domain: YOUTUBE_DOMAIN,
          timeLimit: youtube.timeLimit,
          action: 'toggle',
          onConfirm: () => onYouTubeChange({ ...youtube, [key]: false })
        });
        return;
      }
      onYouTubeChange({ ...youtube, [key]: checked });
    },
    [youtube, onYouTubeChange, onRequestUnblock]
  );

  const handleTypeChange = useCallback((newType: LimitTypeOption) => {
    setSelectedType(newType);

    if (newType !== 'always') {
      const defaultMinutes = TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60;
      setMinutes(roundToNearestPreset(defaultMinutes));
    }
  }, []);

  const handleMinutesChange = useCallback((value: string) => {
    const newMinutes = parseInt(value, 10);
    if (isNaN(newMinutes) || newMinutes < 1) return;
    setMinutes(newMinutes);
  }, []);

  const handleSave = useCallback(() => {
    if (selectedType === 'always') {
      onYouTubeChange({ ...youtube, timeLimit: null });
    } else {
      onYouTubeChange({
        ...youtube,
        timeLimit: {
          type: selectedType,
          limitSeconds: minutes * 60
        }
      });
    }
    showSavedFeedback();
  }, [selectedType, minutes, youtube, onYouTubeChange, showSavedFeedback]);

  const typeOptions = [
    { value: 'always', label: getMessage('alwaysBlocked') },
    { value: 'daily', label: getMessage('dailyLimit') }
  ];

  const getPresetOptions = () => {
    const presets = TIME_LIMIT_CONFIG.DAILY_PRESET_MINUTES;

    return presets.map((preset) => ({
      value: preset.toString(),
      label: `${preset} ${getMessage('minutes')}`
    }));
  };

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

      {isEnabled && (
        <div className="mb-4">
          <YouTubeFeatureToggle
            icon={<ShieldBan className="w-4 h-4" />}
            title={getMessage('youtubeBlockAccess')}
            description={getMessage('youtubeBlockAccessDescription')}
            checked={youtube.blockAccess}
            onChange={handleToggle('blockAccess')}
            disabled={!isEnabled}
          />

          {blockAccessEnabled && (
            <div className="mt-3 ml-8 p-3 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-medium text-gray-700">
                  {getMessage('timeLimitSettings')}
                </h4>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {getMessage('timeLimitType')}
                </label>
                <Select
                  value={selectedType}
                  onChange={(value) =>
                    handleTypeChange(value as LimitTypeOption)
                  }
                  options={typeOptions}
                />
              </div>

              {selectedType !== 'always' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {getMessage('timeLimitDuration')}
                  </label>
                  <Select
                    value={minutes.toString()}
                    onChange={handleMinutesChange}
                    options={getPresetOptions()}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {getMessage('resetDaily')}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  size="sm"
                  variant="primary"
                >
                  {getMessage('save')}
                </Button>
                {showSaved && (
                  <div className="flex items-center gap-1 text-xs text-success-600 animate-fade-in">
                    <Check className="w-3 h-3" />
                    <span>{getMessage('saved')}</span>
                  </div>
                )}
              </div>

              {youtube.timeLimit && (
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  {getMessage('currentSetting')}: {getMessage('dailyLimit')} -{' '}
                  {Math.floor(youtube.timeLimit.limitSeconds / 60)}{' '}
                  {getMessage('minutes')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            checked={youtube[feature.key]}
            onChange={handleToggle(feature.key)}
            disabled={!isEnabled}
          />
        ))}
      </div>
    </Card>
  );
}
