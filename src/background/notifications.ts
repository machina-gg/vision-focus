import { getSettings } from '~/lib/storage';
import type { SiteBlockStatus } from '~/lib/blockService';
import { toDateKey } from '~/lib/time';
import { getMessage } from '~/lib/i18n';
import { isExtensionContextValid } from '~/lib/chromeApi';

const SECONDS_PER_MINUTE = 60;

const notifiedDomains = new Map<string, string>();

// 時間制限の使用量と同じローカル日付で区切る（ずれると通知が出ない・同じ日に 2 回出る）
function getResetKey(): string {
  return toDateKey(new Date());
}

function hasBeenNotified(domain: string): boolean {
  const notifiedKey = notifiedDomains.get(domain);
  return notifiedKey === getResetKey();
}

function markAsNotified(domain: string): void {
  notifiedDomains.set(domain, getResetKey());
}

export function clearExpiredNotifications(): void {
  const dailyKey = getResetKey();

  for (const [domain, resetKey] of notifiedDomains.entries()) {
    if (resetKey !== dailyKey) {
      notifiedDomains.delete(domain);
    }
  }
}

function isNotificationsApiAvailable(): boolean {
  return !!chrome?.notifications?.create;
}

const FALLBACK_NOTIFICATION_ICON_PATH = 'icon/128.png';

function getNotificationIconUrl(): string {
  const iconPath =
    chrome.runtime.getManifest?.()?.icons?.['128'] ??
    FALLBACK_NOTIFICATION_ICON_PATH;
  return chrome.runtime.getURL(iconPath);
}

async function showTimeLimitNotification(
  domain: string,
  remainingMinutes: number,
  totalMinutes: number
): Promise<void> {
  if (!isNotificationsApiAvailable()) {
    return;
  }

  if (!isExtensionContextValid()) {
    return;
  }

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

export function resetNotificationState(): void {
  notifiedDomains.clear();
}
