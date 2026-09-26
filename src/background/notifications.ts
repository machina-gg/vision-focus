import { getSettings } from '~/lib/storage';
import type { SiteBlockStatus } from '~/lib/blockService';
import { toDateKey } from '~/lib/time';
import { getMessage } from '~/lib/i18n';
import { isExtensionContextValid } from '~/lib/chromeApi';

const SECONDS_PER_MINUTE = 60;

// 通知済みのサイト。値は通知した日（ローカル日付）
const notifiedDomains = new Map<string, string>();

// 時間制限の使用量はローカル日付の行で数えるので、通知済みの区切りも同じ日付にする
// （ずれると日が変わっても通知が出ない、または同じ日に 2 回出る）
function getResetKey(): string {
  return toDateKey(new Date());
}

// Check if a domain has already been notified in the current period
function hasBeenNotified(domain: string): boolean {
  const notifiedKey = notifiedDomains.get(domain);
  return notifiedKey === getResetKey();
}

// Mark a domain as notified for the current period
function markAsNotified(domain: string): void {
  notifiedDomains.set(domain, getResetKey());
}

// Clear notification state for domains that have reset
export function clearExpiredNotifications(): void {
  const dailyKey = getResetKey();

  for (const [domain, resetKey] of notifiedDomains.entries()) {
    // If the stored key doesn't match the current daily key, remove it
    if (resetKey !== dailyKey) {
      notifiedDomains.delete(domain);
    }
  }
}

// Check if chrome.notifications API is available
function isNotificationsApiAvailable(): boolean {
  return !!chrome?.notifications?.create;
}

// manifest から引けなかったときに使う通知アイコンのパス
const FALLBACK_NOTIFICATION_ICON_PATH = 'icon/128.png';

// 通知アイコンの URL を返す。パスの SSOT は manifest の icons（wxt.config.ts が生成する）で、
// ビルド出力の配置が変わっても追随する（machina-gg/vision-focus#400）
function getNotificationIconUrl(): string {
  const iconPath =
    chrome.runtime.getManifest?.()?.icons?.['128'] ??
    FALLBACK_NOTIFICATION_ICON_PATH;
  return chrome.runtime.getURL(iconPath);
}

// Show a time limit notification
async function showTimeLimitNotification(
  domain: string,
  remainingMinutes: number,
  totalMinutes: number
): Promise<void> {
  // Guard: skip if chrome.notifications API is unavailable
  if (!isNotificationsApiAvailable()) {
    return;
  }

  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    return;
  }

  // 時間制限は 1 日単位のみ
  const typeLabel = getMessage('perDay');

  await chrome.notifications.create(`time-limit-${domain}-${Date.now()}`, {
    type: 'basic',
    iconUrl: getNotificationIconUrl(),
    title: getMessage('notificationTimeLimitTitle'),
    message: getMessage('notificationTimeLimitMessage', [
      domain,
      remainingMinutes.toString(),
      totalMinutes.toString(),
      typeLabel
    ]),
    priority: 2
  });
}

/**
 * 時間制限の残りが通知の閾値を下回ったら 1 日 1 回通知する。
 * 残り時間は判定（`evaluateBlock`）の値を使うので、一時停止中・スケジュール外・無効な項目
 * （残り時間を持たない）は通知しない
 */
export async function checkTimeLimitNotification(
  status: SiteBlockStatus
): Promise<void> {
  const { site, rule, state } = status;
  const remainingSeconds = state.remainingSeconds;
  if (!rule.timeLimit || remainingSeconds === undefined) return;
  if (remainingSeconds <= 0) return;

  const settings = await getSettings();
  if (!settings.notifications?.timeLimitEnabled) return;
  if (hasBeenNotified(site)) return;

  const remainingMinutes = Math.ceil(remainingSeconds / SECONDS_PER_MINUTE);
  if (remainingMinutes > settings.notifications.timeLimitMinutes) return;

  const totalMinutes = Math.round(
    rule.timeLimit.limitSeconds / SECONDS_PER_MINUTE
  );
  await showTimeLimitNotification(site, remainingMinutes, totalMinutes);
  markAsNotified(site);
}

// Reset notification state (useful for testing or when user changes settings)
export function resetNotificationState(): void {
  notifiedDomains.clear();
}
