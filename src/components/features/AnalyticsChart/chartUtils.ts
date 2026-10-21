import { parseDateKey } from '~/lib/activityStats';
import { formatTime } from '~/lib/time';

const SECONDS_PER_MINUTE = 60;

/**
 * 日付キーをグラフの軸用の短い表記（例: Jan 5）にする
 * new Date('YYYY-MM-DD') は UTC の 0 時として読まれ、UTC より西では前日になるため使わない
 * @param dateStr 日付キー（YYYY-MM-DD。ローカル時刻の日付として読む）
 * @returns 英語の月の略称と日（例: Jan 5）
 */
export function formatDate(dateStr: string): string {
  const date = parseDateKey(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * 分をツールチップ用の表記（formatTime の形。45s / 12m / 1h 5m）にする
 * @param minutes 分（小数は秒に戻して扱い、端数の秒は切り捨てる）
 * @returns formatTime の形の表記
 */
export function formatMinutes(minutes: number): string {
  // 軸の単位変換で出る浮動小数点の誤差で 1 秒ずれないよう、秒は先に丸めてから formatTime に渡す
  return formatTime(Math.round(minutes * SECONDS_PER_MINUTE));
}

/**
 * グラフの縦軸を分と時間のどちらで刻むかと、その単位への変換関数を返す
 * @param maxValue 表示するデータの最大値（分。120 以上なら時間単位にする）
 * @returns 時間単位か（useHours）・目盛りの表記関数・分から軸の単位への変換（transformData）・軸の単位から分への戻し（restoreValue）
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

/** サイト別グラフの棒の色（サイトの順位順に使い、足りなければ先頭から繰り返す） */
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
