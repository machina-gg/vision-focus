import { parseDateKey } from '~/lib/activityStats';

/** new Date('YYYY-MM-DD') は UTC の 0 時として読まれ、UTC より西では前日になるため使わない */
export function formatDate(dateStr: string): string {
  const date = parseDateKey(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function getTimeAxisConfig(maxValue: number) {
  const useHours = maxValue >= 120;
  const tickFormatter = (v: number) => (useHours ? `${v}h` : `${v}m`);

  return {
    useHours,
    tickFormatter,
    transformData: (value: number) => (useHours ? value / 60 : value),
    restoreValue: (value: number) => (useHours ? value * 60 : value)
  };
}

export const SITE_COLORS = [
  '#fdba74',
  '#fcd34d',
  '#bef264',
  '#6ee7b7',
  '#67e8f9',
  '#a5b4fc',
  '#d8b4fe',
  '#f9a8d4'
];
