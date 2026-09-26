import { useEffect, useMemo, useState } from 'react';

import { presetToDisplaySettings } from '~/lib/presetUtils';
import { isWithinSchedule } from '~/lib/time';
import type {
  VisionSettings,
  DashboardDisplaySettings,
  AppSettings
} from '~/types/storage';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

interface UseResolvedPresetOptions {
  /** 保存済みのダッシュボードの設定。読み込み前は undefined */
  vision: VisionSettings | undefined;
  /** 今のアプリ設定（スケジュールの判定に使う）。読み込み前は undefined */
  settings: AppSettings | undefined;
}

interface UseResolvedPresetReturn {
  /** 今表示する表示設定 */
  displaySettings: DashboardDisplaySettings;
  /** タブが再表示されるたびに 1 増える数（判定し直すきっかけ） */
  timeTick: number;
}

/**
 * ダッシュボードに今表示する表示設定を返す（時間内のスケジュールのスタイル > 適用中のスタイル > 既定。タブの再表示で判定し直す）
 * @param options フックの入力（下記の項目）
 * @param options.vision 保存済みのダッシュボードの設定。読み込み前は undefined（既定の表示設定を返す）
 * @param options.settings 今のアプリ設定。読み込み前は undefined（スケジュールを見ない）
 * @returns 今表示する表示設定と、再表示の回数
 */
export function useResolvedPreset({
  vision,
  settings
}: UseResolvedPresetOptions): UseResolvedPresetReturn {
  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeTick((prev) => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const displaySettings: DashboardDisplaySettings = useMemo(() => {
    if (!vision) return DEFAULT_DISPLAY_SETTINGS;

    const activeScheduleWithPreset = settings?.schedules?.find(
      (schedule) =>
        schedule.enabled &&
        schedule.presetId &&
        isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
    );

    if (activeScheduleWithPreset?.presetId) {
      const schedulePreset = vision.presets?.find(
        (p) => p.id === activeScheduleWithPreset.presetId
      );
      if (schedulePreset) {
        return presetToDisplaySettings(schedulePreset);
      }
    }

    if (vision.activePresetId) {
      const activePreset = vision.presets?.find(
        (p) => p.id === vision.activePresetId
      );
      if (activePreset) {
        return presetToDisplaySettings(activePreset);
      }
    }

    return vision.defaultSettings || DEFAULT_DISPLAY_SETTINGS;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeTick forces re-computation on tab visibility change
  }, [vision, settings, timeTick]);

  return { displaySettings, timeTick };
}
