import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo
} from 'react';

import { Settings, ShieldX, Clock } from 'lucide-react';

import { DownloadButton } from '~/components/features';
import { MiniStats, GoalDisplay, BlockedSitesList } from '~/components/newtab';
import { calculateBlockingDays } from '~/lib/blockingDays';
import { openExtensionPage, openOptionsPage } from '~/lib/chromeApi';
import {
  blockCountsByDomain,
  blockedHostTotals,
  todayStats,
  useActivitySources,
  useBackgroundPreload,
  useResolvedPreset,
  useStorageItem
} from '~/hooks';
import { getMessage } from '~/lib/i18n';
import { formatTimeLocalized } from '~/lib/time';
import {
  clearLastBlockedDomain,
  getLastBlockedDomain,
  settingsItem,
  sitesItem,
  visionItem
} from '~/lib/storage';

import '~/styles/globals.css';

/**
 * 新しいタブの画面（目標と今日の記録を出し、ブロックで移ってきたときはブロックしたサイトの情報も出す）
 * @returns 新しいタブの画面
 */
export function NewtabApp() {
  const [vision, setVision] = useStorageItem(visionItem);
  const [settings] = useStorageItem(settingsItem);
  const [trackedSites] = useStorageItem(sitesItem);
  const { activity, sites } = useActivitySources();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // ブロックの記録はリダイレクトと前後するので、数値は読んだ時点で固定せず activity から導出する
  const [blockedDomain, setBlockedDomain] = useState<string | null>(null);

  const [blockReason, setBlockReason] = useState<string | null>(null);

  const { displaySettings } = useResolvedPreset({ vision, settings });

  const { isStorageLoaded, isBackgroundReady, containerStyle, fontStyle } =
    useBackgroundPreload({ displaySettings });

  useEffect(() => {
    const loadBlockedInfo = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const reason = urlParams.get('reason');
      if (reason) {
        setBlockReason(reason);
      }

      const domain = await getLastBlockedDomain();
      if (domain) {
        setBlockedDomain(domain);
        await clearLastBlockedDomain();
      }
    };
    loadBlockedInfo();
  }, []);

  // 日付は描画のたびに取り直す（開いたまま 0 時をまたいでも今日の値にするため）
  const now = new Date();
  const today = todayStats(activity, sites, now);
  const blockCounts = blockCountsByDomain(
    activity,
    Object.values(trackedSites),
    now
  );
  const blockedInfo = blockedDomain
    ? {
        domain: blockedDomain,
        ...blockedHostTotals(activity, sites, blockedDomain, now)
      }
    : null;

  const goalText = displaySettings.goalText;
  const goalSubText = displaySettings.goalSubText;
  const textColor = displaySettings.textColor;

  const blockingDays = useMemo(() => {
    if (!blockedDomain) return null;

    return calculateBlockingDays(blockedDomain, trackedSites);
  }, [blockedDomain, trackedSites]);

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
      await setVision(updated);
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

  const isReady = isStorageLoaded && isBackgroundReady;

  if (!isReady) {
    return (
      <div
        className="newtab-container relative flex flex-col items-center justify-center"
        style={{ backgroundColor: '#1a1a2e' }}
        data-testid="newtab-container"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="newtab-container relative flex flex-col items-center justify-center"
      style={containerStyle}
      data-testid="newtab-container"
    >
      <div
        className="absolute inset-0 bg-black/30"
        data-testid="newtab-overlay"
      />

      <div className="relative z-10 w-full max-w-2xl px-8 text-center">
        {blockedInfo && (
          <div className="mb-8 animate-fade-in" data-testid="newtab-block-info">
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
                <p
                  className="text-white font-medium"
                  data-testid="newtab-block-info-message"
                >
                  {blockReason === 'time_limit_exceeded'
                    ? getMessage('timeLimitReached')
                    : getMessage('siteBlockedMessage', blockedInfo.domain)}
                </p>
                {blockReason === 'time_limit_exceeded' ? (
                  <p className="text-warning-200 text-sm">
                    {getMessage(
                      'timeLimitReachedDescription',
                      blockedInfo.domain
                    )}
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-danger-200 text-sm">
                      {getMessage(
                        'blockedTimes',
                        blockedInfo.blocks.toString()
                      )}
                    </p>
                    {blockedInfo.seconds > 0 && (
                      <p className="text-danger-100 text-sm">
                        {getMessage(
                          'wastedTime',
                          formatTimeLocalized(blockedInfo.seconds)
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

        <MiniStats
          blockCount={today.blocks}
          blockingDays={blockingDays}
          onAnalyticsClick={handleAnalyticsClick}
        />

        <BlockedSitesList
          trackedSites={trackedSites}
          blockCounts={blockCounts}
        />

        {!hasPresets && (
          <div
            className="mt-8 pt-6 border-t border-white/10"
            data-html2canvas-ignore="true"
          >
            <p className="text-gray-300 text-sm mb-3 drop-shadow">
              {getMessage('noPresetsDescription')}
            </p>
            <button
              data-testid="newtab-setup-cta"
              onClick={handleSettingsClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-info-600 hover:bg-info-700 text-white font-medium rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              {getMessage('createFirstPreset')}
            </button>
          </div>
        )}
      </div>

      <div
        className="absolute bottom-6 right-6 flex items-center gap-3"
        data-html2canvas-ignore="true"
      >
        {/* ref は描画の後に入る。描画中に containerRef.current で出し分けるとボタンが出ないことがある */}
        <DownloadButton
          targetRef={containerRef as React.RefObject<HTMLElement>}
        />

        <button
          data-testid="newtab-settings-button"
          onClick={handleSettingsClick}
          className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
