import { MS_PER_DAY } from '~/constants/intervals';
import { getUILanguage } from '~/lib/i18n';
import type { DateKey } from '~/types/activity';

/**
 * 秒を "45s" / "12m" / "1h 5m" の形にする
 * @param seconds 秒数
 * @returns 60 秒未満は秒、1 時間未満は分（端数の秒は切り捨て）、それ以上は時間と分
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * 秒を UI 言語に合わせた表示（"1時間5分" / "1 hr 5 min" など）にする
 * @param seconds 秒数
 * @returns 60 秒未満は秒、1 時間未満は分、それ以上は時間と分（0 分なら時間だけ）
 */
export function formatTimeLocalized(seconds: number): string {
  const language = getUILanguage();

  if (seconds < 60) {
    return language === 'ja' ? `${seconds}秒` : `${seconds} sec`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    if (language === 'ja') {
      return minutes > 0 ? `${hours}時間${minutes}分` : `${hours}時間`;
    } else {
      return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }
  }

  return language === 'ja' ? `${minutes}分` : `${minutes} min`;
}

/**
 * 秒を "m:ss" か "h:mm:ss" の形にする
 * @param seconds 秒数
 * @returns 1 時間未満は "m:ss"、それ以上は "h:mm:ss"
 */
export function formatTimeShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 今日の UTC の日付（YYYY-MM-DD）。ローカル日付が要るなら toDateKey を使う
 * @returns UTC の日付の文字列
 */
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * ローカル日付の日付キー（YYYY-MM-DD）
 * @param date 日付キーにする時刻
 * @returns ローカルの年月日の日付キー
 */
// toISOString は UTC の日付になり、UTC より東のタイムゾーンでは前日にずれるため、ローカルの年月日から組み立てる
export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * UTC の日付（YYYY-MM-DD）。ローカル日付が要るなら toDateKey を使う
 * @param date 日付にする時刻
 * @returns UTC の日付の文字列
 */
export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 日付が今から days 日以内か
 * @param dateKey Date で読める日付の文字列（YYYY-MM-DD なら UTC の 0 時として読む）
 * @param days 何日以内か
 * @returns 今との差が days 日以下なら true（未来の日付も true）
 */
export function isWithinDays(dateKey: string, days: number): boolean {
  const date = new Date(dateKey);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / MS_PER_DAY;
  return diffDays <= days;
}

/**
 * 今日から遡る n 日の UTC の日付（新しい順）
 * @param n 日数
 * @returns 今日を含む n 件の UTC の日付の文字列
 */
export function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(getDateKey(date));
  }

  return dates;
}

/**
 * "HH:MM" の形か（"24:00" も許す）
 * @param time 確かめる時刻の文字列（時は 1 桁も許す）
 * @returns 正しい形なら true
 */
export function isValidTimeString(time: string): boolean {
  if (!time || typeof time !== 'string') return false;
  if (time === '24:00') return true;
  const match = time.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  return match !== null;
}

/**
 * "HH:MM" を 0 時からの分にする（形が不正なら 0）
 * @param time 時刻の文字列
 * @returns 0 時からの分（"24:00" は 1440）
 */
export function parseTimeToMinutes(time: string): number {
  if (!isValidTimeString(time)) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 終了時刻の "00:00" を、その日の終わりの "24:00" に読み替える
 * @param endTime 終了時刻の文字列
 * @returns "00:00" なら "24:00"、それ以外はそのまま
 */
export function normalizeEndTime(endTime: string): string {
  return endTime === '00:00' ? '24:00' : endTime;
}

/**
 * 現在時刻が曜日と時間帯の範囲内か（終了が開始以前なら日をまたぐ範囲として扱う）
 * @param startTime 開始時刻（"HH:MM"。この分を含む）
 * @param endTime 終了時刻（"HH:MM"。この分を含まない。"00:00" はその日の終わり）
 * @param days 曜日（0 = 日曜。Date#getDay と同じ）
 * @returns 範囲内なら true（時刻の形が不正か曜日が空なら false）
 */
export function isWithinSchedule(
  startTime: string,
  endTime: string,
  days: number[]
): boolean {
  const normalizedEndTime = normalizeEndTime(endTime);

  if (!isValidTimeString(startTime) || !isValidTimeString(normalizedEndTime)) {
    return false;
  }
  if (!Array.isArray(days) || days.length === 0) {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay();

  if (!days.includes(currentDay)) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(normalizedEndTime);

  if (endMinutes <= startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
