/**
 * チャート共通ユーティリティ
 */

/**
 * 日付文字列をフォーマット (e.g., "Jan 1")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * 分を時間と分の文字列にフォーマット (e.g., "2h 30m" or "45m")
 */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * チャートの Y 軸設定を取得
 * maxValue が 120 分以上の場合は時間単位、それ以外は分単位
 */
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

/**
 * サイト別チャート用カラーパレット
 */
export const SITE_COLORS = [
  '#fdba74', // orange-300
  '#fcd34d', // amber-300
  '#bef264', // lime-300
  '#6ee7b7', // emerald-300
  '#67e8f9', // cyan-300
  '#a5b4fc', // indigo-300
  '#d8b4fe', // purple-300
  '#f9a8d4' // pink-300
];
