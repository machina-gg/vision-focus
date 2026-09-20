import { getSettings } from '~/lib/storage';
import { findEnabledBlockItemForDomain } from '~/lib/blockService';
import { getRemainingTime } from '~/lib/timeLimitService';
import {
  getYouTubeRemainingTime,
  isYouTubeTimeLimitActive
} from '~/lib/youtubeBlockService';
import { getMessage } from '~/lib/i18n';
import { isExtensionContextValid } from '~/lib/chromeApi';

// In-memory state to track which domains have been notified
// Key: domain, Value: reset key (YYYY-MM-DD)
const notifiedDomains = new Map<string, string>();

// Get the reset key for the current period (time limits reset daily)
function getResetKey(): string {
  return new Date().toISOString().split('T')[0];
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

// Check and potentially send notification for a domain
// Uses centralized BlockService for consistent state checking
export async function checkTimeLimitNotification(
  domain: string
): Promise<void> {
  const settings = await getSettings();

  // Check if notifications are enabled
  if (!settings.notifications?.timeLimitEnabled) {
    return;
  }

  // Use centralized service to find enabled block item
  const blockItem = await findEnabledBlockItemForDomain(domain);

  // Only process domains with time limits
  if (!blockItem || !blockItem.timeLimit) {
    return;
  }

  const { limitSeconds } = blockItem.timeLimit;

  // Check if already notified in this period
  if (hasBeenNotified(domain)) {
    return;
  }

  // Use centralized service for remaining time
  const remainingSeconds = await getRemainingTime(domain, blockItem);

  // If no remaining time info or already exceeded, skip
  if (remainingSeconds === null || remainingSeconds <= 0) {
    return;
  }

  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  const notifyAtMinutes = settings.notifications.timeLimitMinutes;

  // Check if we should notify
  if (remainingMinutes <= notifyAtMinutes) {
    const totalMinutes = Math.round(limitSeconds / 60);
    await showTimeLimitNotification(domain, remainingMinutes, totalMinutes);
    markAsNotified(domain);
  }
}

// Check and potentially send notification for YouTube time limit
export async function checkYouTubeTimeLimitNotification(): Promise<void> {
  const settings = await getSettings();

  if (!settings.notifications?.timeLimitEnabled) {
    return;
  }

  // アクセスブロックが無効なら時間制限そのものを使わないので通知もしない（#407）
  const youtube = settings.youtube;
  if (!isYouTubeTimeLimitActive(youtube)) {
    return;
  }

  const { limitSeconds } = youtube.timeLimit;

  if (hasBeenNotified('youtube.com')) {
    return;
  }

  const remainingSeconds = await getYouTubeRemainingTime();

  if (remainingSeconds === null || remainingSeconds <= 0) {
    return;
  }

  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  const notifyAtMinutes = settings.notifications.timeLimitMinutes;

  if (remainingMinutes <= notifyAtMinutes) {
    const totalMinutes = Math.round(limitSeconds / 60);
    await showTimeLimitNotification(
      'youtube.com',
      remainingMinutes,
      totalMinutes
    );
    markAsNotified('youtube.com');
  }
}

// Reset notification state (useful for testing or when user changes settings)
export function resetNotificationState(): void {
  notifiedDomains.clear();
}
