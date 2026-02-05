import { useCallback, useEffect, useMemo, useState } from 'react';

import { presetToDisplaySettings } from '~/lib/presetUtils';
import { isWithinSchedule } from '~/lib/time';
import type {
  VisionSettings,
  DashboardDisplaySettings,
  AppSettings
} from '~/types/storage';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';
import { FEATURE_LIMITS } from '~/types/premium';

interface UseResolvedPresetOptions {
  vision: VisionSettings | undefined;
  settings: AppSettings | undefined;
  isPremium: boolean;
}

interface UseResolvedPresetReturn {
  displaySettings: DashboardDisplaySettings;
  timeTick: number;
}

export function useResolvedPreset({
  vision,
  settings,
  isPremium
}: UseResolvedPresetOptions): UseResolvedPresetReturn {
  // Time tick for schedule checking (updates when tab becomes visible)
  const [timeTick, setTimeTick] = useState(0);

  // Re-check schedule when tab becomes visible
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

  const isPresetAvailable = useCallback(
    (presetId: string, presets: VisionSettings['presets']) => {
      if (isPremium) return true;
      const index = presets?.findIndex((p) => p.id === presetId) ?? -1;
      return index >= 0 && index < FEATURE_LIMITS.free.maxPresets;
    },
    [isPremium]
  );

  // Priority: 1. Active schedule preset, 2. User-selected preset (activePresetId), 3. Default settings
  const displaySettings: DashboardDisplaySettings = useMemo(() => {
    if (!vision) return DEFAULT_DISPLAY_SETTINGS;

    const activeScheduleWithPreset = settings?.schedules?.find(
      (schedule) =>
        schedule.enabled &&
        schedule.presetId &&
        isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
    );

    if (activeScheduleWithPreset?.presetId) {
      if (
        isPresetAvailable(activeScheduleWithPreset.presetId, vision.presets)
      ) {
        const schedulePreset = vision.presets?.find(
          (p) => p.id === activeScheduleWithPreset.presetId
        );
        if (schedulePreset) {
          return presetToDisplaySettings(schedulePreset, isPremium);
        }
      }
    }

    if (vision.activePresetId) {
      if (isPresetAvailable(vision.activePresetId, vision.presets)) {
        const activePreset = vision.presets?.find(
          (p) => p.id === vision.activePresetId
        );
        if (activePreset) {
          return presetToDisplaySettings(activePreset, isPremium);
        }
      }
    }

    const defaultSettings = vision.defaultSettings || DEFAULT_DISPLAY_SETTINGS;
    return {
      ...defaultSettings,
      customBackgroundData: isPremium
        ? defaultSettings.customBackgroundData
        : null
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeTick forces re-computation on tab visibility change
  }, [vision, settings, timeTick, isPremium, isPresetAvailable]);

  return { displaySettings, timeTick };
}
