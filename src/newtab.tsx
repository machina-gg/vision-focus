import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo
} from 'react';

import { useStorage } from '@plasmohq/storage/hook';
import { Settings, ShieldX, Clock } from 'lucide-react';

import { DownloadButton } from '~/components/features';
import { MiniStats, GoalDisplay, BlockedSitesList } from '~/components/newtab';
import { NEWTAB_STATS_POLLING_MS, MS_PER_DAY } from '~/constants/intervals';
import { openExtensionPage, openOptionsPage } from '~/lib/chromeApi';
import {
  useBackgroundPreload,
  useBackgroundStats,
  usePremiumStatus,
  useResolvedPreset
} from '~/hooks';
import { getMessage, setCurrentLanguage } from '~/lib/i18n';
import {
  getLastBlockedDomain,
  clearLastBlockedDomain,
  getSiteBlockCount
} from '~/lib/storage';
import { storage } from '~/lib/storage';
import type {
  VisionSettings,
  AppSettings,
  AnalyticsData
} from '~/types/storage';
import {
  DEFAULT_VISION,
  DEFAULT_SETTINGS,
  DEFAULT_ANALYTICS
} from '~/types/storage';

import './styles/globals.css';

function NewtabApp() {
  const [vision, setVision] = useStorage<VisionSettings>(
    {
      key: 'vision',
      instance: storage
    },
    DEFAULT_VISION
  );
  const [settings] = useStorage<AppSettings>(
    {
      key: 'settings',
      instance: storage
    },
    DEFAULT_SETTINGS
  );
  const [analytics] = useStorage<AnalyticsData>(
    {
      key: 'analytics',
      instance: storage
    },
    DEFAULT_ANALYTICS
  );
  const stats = useBackgroundStats(NEWTAB_STATS_POLLING_MS);
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Blocked site info (shown when redirected from a blocked site)
  const [blockedInfo, setBlockedInfo] = useState<{
    domain: string;
    count: number;
  } | null>(null);

  // Block reason (from URL parameter)
  const [blockReason, setBlockReason] = useState<string | null>(null);

  const { displaySettings } = useResolvedPreset({
    vision,
    settings,
    isPremium
  });

  const { isStorageLoaded, isBackgroundReady, containerStyle, fontStyle } =
    useBackgroundPreload({ displaySettings });

  // Check if we were redirected from a blocked site
  useEffect(() => {
    const loadBlockedInfo = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const reason = urlParams.get('reason');
      if (reason) {
        setBlockReason(reason);
      }

      const domain = await getLastBlockedDomain();
      if (domain) {
        const count = await getSiteBlockCount(domain);
        setBlockedInfo({ domain, count });
        await clearLastBlockedDomain();
      }
    };
    loadBlockedInfo();
  }, []);

  // Sync language setting with i18n module
  useEffect(() => {
    if (settings?.language !== undefined) {
      setCurrentLanguage(settings.language);
    }
  }, [settings?.language]);

  const goalText = displaySettings.goalText;
  const goalSubText = displaySettings.goalSubText;
  const textColor = displaySettings.textColor;

  // Calculate blocking days for the blocked site
  const blockingDays = useMemo(() => {
    if (!blockedInfo?.domain || !settings?.blockList) return null;

    const blockItem = settings.blockList.find(
      (item) =>
        item.domain === blockedInfo.domain ||
        (item.isWildcard &&
          blockedInfo.domain.endsWith(item.domain.replace('*.', '.')))
    );

    if (!blockItem?.createdAt) return null;

    const createdDate = new Date(blockItem.createdAt);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / MS_PER_DAY);

    return Math.max(1, diffDays);
  }, [blockedInfo?.domain, settings?.blockList]);

  const handleAnalyticsClick = useCallback(() => {
    openExtensionPage('options.html#analytics');
  }, []);

  const handleStartEdit = useCallback(() => {
    setEditText(goalText);
    setIsEditing(true);
  }, [goalText]);

  const handleSaveGoal = useCallback(async () => {
    if (vision && editText.trim()) {
      const updated = {
        ...vision,
        defaultSettings: {
          ...vision.defaultSettings,
          goalText: editText.trim()
        }
      };
      await storage.set('vision', updated);
      setVision(updated);
    }
    setIsEditing(false);
  }, [vision, editText, setVision]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveGoal();
      }
      if (e.key === 'Escape') {
        setIsEditing(false);
      }
    },
    [handleSaveGoal]
  );

  const handleSettingsClick = useCallback(() => {
    openOptionsPage();
  }, []);

  const hasPresets = (vision?.presets?.length ?? 0) > 0;

  const isReady = isStorageLoaded && (isBackgroundReady || !isPremiumLoading);

  if (!isReady) {
    return (
      <div
        className="newtab-container relative flex flex-col items-center justify-center"
        style={{ backgroundColor: '#1a1a2e' }}
      />
    );
  }

  // Simple block page UI (when no presets are configured)
  if (!hasPresets) {
    return (
      <div
        ref={containerRef}
        className="newtab-container relative flex flex-col items-center justify-center"
        style={{ backgroundColor: '#1a1a2e' }}
      >
        {/* Content */}
        <div className="relative z-10 w-full max-w-md px-8 text-center">
          {/* Block Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-danger-500/20 rounded-full flex items-center justify-center">
              <ShieldX className="w-12 h-12 text-danger-400" />
            </div>
          </div>

          {/* Block Message */}
          {blockedInfo ? (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                {blockReason === 'time_limit_exceeded'
                  ? getMessage('timeLimitReached')
                  : getMessage('siteBlocked')}
              </h1>
              <p className="text-gray-300 mb-4">{blockedInfo.domain}</p>
              {blockReason === 'time_limit_exceeded' ? (
                <p className="text-warning-300 text-sm">
                  {getMessage(
                    'timeLimitReachedDescription',
                    blockedInfo.domain
                  )}
                </p>
              ) : (
                <p className="text-danger-300 text-sm">
                  {getMessage('blockedTimes', blockedInfo.count.toString())}
                </p>
              )}
            </div>
          ) : (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                VisionFocus
              </h1>
              <p className="text-gray-400">{getMessage('rememberGoal')}</p>
            </div>
          )}

          {/* Mini Stats */}
          <MiniStats
            blockCount={stats.blockCount}
            blockingDays={blockingDays}
            isPremium={isPremium}
            onAnalyticsClick={handleAnalyticsClick}
          />

          {/* Blocked Sites List */}
          <BlockedSitesList
            blockList={settings?.blockList || []}
            blockCounts={analytics?.siteBlockCounts || {}}
          />

          {/* Setup CTA */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-gray-400 text-sm mb-3">
              {getMessage('noPresetsDescription')}
            </p>
            <button
              onClick={handleSettingsClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-info-600 hover:bg-info-700 text-white font-medium rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              {getMessage('createFirstPreset')}
            </button>
          </div>
        </div>

        {/* Settings Button - excluded from wallpaper capture */}
        <div
          className="absolute bottom-6 right-6"
          data-html2canvas-ignore="true"
        >
          <button
            onClick={handleSettingsClick}
            className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Full dashboard UI (when presets are configured)
  return (
    <div
      ref={containerRef}
      className="newtab-container relative flex flex-col items-center justify-center"
      style={containerStyle}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl px-8 text-center">
        {/* Blocked Site Info */}
        {blockedInfo && (
          <div className="mb-8 animate-fade-in">
            <div
              className={`inline-flex items-center gap-3 ${
                blockReason === 'time_limit_exceeded'
                  ? 'bg-warning-500/20 border-warning-500/30'
                  : 'bg-danger-500/20 border-danger-500/30'
              } backdrop-blur-sm rounded-xl px-6 py-4 border`}
            >
              {blockReason === 'time_limit_exceeded' ? (
                <Clock className="w-6 h-6 text-warning-400" />
              ) : (
                <ShieldX className="w-6 h-6 text-danger-400" />
              )}
              <div className="text-left">
                <p className="text-white font-medium">
                  {blockReason === 'time_limit_exceeded'
                    ? getMessage('timeLimitReached')
                    : getMessage('siteBlockedMessage', blockedInfo.domain)}
                </p>
                <p
                  className={`${
                    blockReason === 'time_limit_exceeded'
                      ? 'text-warning-200'
                      : 'text-danger-200'
                  } text-sm`}
                >
                  {blockReason === 'time_limit_exceeded'
                    ? getMessage(
                        'timeLimitReachedDescription',
                        blockedInfo.domain
                      )
                    : getMessage('blockedTimes', blockedInfo.count.toString())}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Goal Text */}
        <div className="mb-12">
          <GoalDisplay
            goalText={goalText}
            goalSubText={goalSubText}
            textColor={textColor}
            fontStyle={fontStyle}
            isEditing={isEditing}
            editText={editText}
            canEdit={!vision?.activePresetId}
            onEditTextChange={setEditText}
            onStartEdit={handleStartEdit}
            onSave={handleSaveGoal}
            onCancel={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Mini Stats */}
        <MiniStats
          blockCount={stats.blockCount}
          blockingDays={blockingDays}
          isPremium={isPremium}
          onAnalyticsClick={handleAnalyticsClick}
        />

        {/* Blocked Sites List */}
        <BlockedSitesList
          blockList={settings?.blockList || []}
          blockCounts={analytics?.siteBlockCounts || {}}
        />
      </div>

      {/* Bottom Controls - excluded from wallpaper capture */}
      <div
        className="absolute bottom-6 right-6 flex items-center gap-3"
        data-html2canvas-ignore="true"
      >
        {/* Download Wallpaper Button (Premium) */}
        {isPremium && containerRef.current && (
          <DownloadButton
            targetRef={containerRef as React.RefObject<HTMLElement>}
          />
        )}

        {/* Settings Button */}
        <button
          onClick={handleSettingsClick}
          className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default NewtabApp;
