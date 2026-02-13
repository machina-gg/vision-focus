import { getSettings } from '~/lib/storage';
import { findEnabledBlockItemForDomain } from '~/lib/blockService';
import { getRemainingTime } from '~/lib/timeLimitService';
import { getYouTubeRemainingTime } from '~/lib/youtubeBlockService';
import { getMessage } from '~/lib/i18n';
import { isExtensionContextValid } from '~/lib/chromeApi';

// In-memory state to track which domains have been notified
// Key: domain, Value: reset key (YYYY-MM-DD for daily, YYYY-MM-DD-HH for hourly)
const notifiedDomains = new Map<string, string>();

// Get the reset key for a domain based on its time limit type
function getResetKey(type: 'daily' | 'hourly'): string {
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];

  if (type === 'hourly') {
    const hour = now.getHours().toString().padStart(2, '0');
    return `${dateKey}-${hour}`;
  }

  return dateKey;
}

// Check if a domain has already been notified in the current period
function hasBeenNotified(domain: string, type: 'daily' | 'hourly'): boolean {
  const resetKey = getResetKey(type);
  const notifiedKey = notifiedDomains.get(domain);
  return notifiedKey === resetKey;
}

// Mark a domain as notified for the current period
function markAsNotified(domain: string, type: 'daily' | 'hourly'): void {
  const resetKey = getResetKey(type);
  notifiedDomains.set(domain, resetKey);
}

// Clear notification state for domains that have reset
export function clearExpiredNotifications(): void {
  const dailyKey = getResetKey('daily');
  const hourlyKey = getResetKey('hourly');

  for (const [domain, resetKey] of notifiedDomains.entries()) {
    // If the stored key doesn't match current daily or hourly key, remove it
    if (resetKey !== dailyKey && resetKey !== hourlyKey) {
      notifiedDomains.delete(domain);
    }
  }
}

// Check if chrome.notifications API is available
function isNotificationsApiAvailable(): boolean {
  return !!chrome?.notifications?.create;
}

// Show a time limit notification
async function showTimeLimitNotification(
  domain: string,
  remainingMinutes: number,
  totalMinutes: number,
  type: 'daily' | 'hourly'
): Promise<void> {
  // Guard: skip if chrome.notifications API is unavailable
  if (!isNotificationsApiAvailable()) {
    return;
  }

  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    return;
  }

  const typeLabel =
    type === 'daily' ? getMessage('perDay') : getMessage('perHour');

  await chrome.notifications.create(`time-limit-${domain}-${Date.now()}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon-128.png'),
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

  const { type, limitSeconds } = blockItem.timeLimit;

  // Check if already notified in this period
  if (hasBeenNotified(domain, type)) {
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
    await showTimeLimitNotification(
      domain,
      remainingMinutes,
      totalMinutes,
      type
    );
    markAsNotified(domain, type);
  }
}

// Check and potentially send notification for YouTube time limit
export async function checkYouTubeTimeLimitNotification(): Promise<void> {
  const settings = await getSettings();

  if (!settings.notifications?.timeLimitEnabled) {
    return;
  }

  const youtube = settings.youtube;
  if (!youtube.enabled || !youtube.timeLimit) {
    return;
  }

  const { type, limitSeconds } = youtube.timeLimit;

  if (hasBeenNotified('youtube.com', type)) {
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
      totalMinutes,
      type
    );
    markAsNotified('youtube.com', type);
  }
}

// Reset notification state (useful for testing or when user changes settings)
export function resetNotificationState(): void {
  notifiedDomains.clear();
}
