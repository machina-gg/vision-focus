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
  vision: VisionSettings | undefined;
  settings: AppSettings | undefined;
}

interface UseResolvedPresetReturn {
  displaySettings: DashboardDisplaySettings;
  timeTick: number;
}

export function useResolvedPreset({
  vision,
  settings
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
