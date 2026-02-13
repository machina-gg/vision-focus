/**
 * GA4 Analytics via Measurement Protocol
 *
 * Sends anonymous usage events only when the user has opted in.
 * No personal data (domains, goals, browsing history) is ever collected.
 */

import { getSettings } from '~/lib/storage';
import { getCurrentLanguage } from '~/lib/i18n';
import { isExtensionContextValid } from '~/lib/chromeApi';

const GA_MEASUREMENT_ID = process.env.PLASMO_PUBLIC_GA_MEASUREMENT_ID ?? '';
const GA_API_SECRET = process.env.PLASMO_PUBLIC_GA_API_SECRET ?? '';
const MP_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
const CLIENT_ID_KEY = 'ga_client_id';
const SESSION_ID_KEY = 'ga_session_id';
const SESSION_START_KEY = 'ga_session_start';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface EventParams {
  [key: string]: string | number | boolean;
}

/** Get or create a persistent client ID */
async function getClientId(): Promise<string> {
  const result = await chrome.storage.local.get(CLIENT_ID_KEY);
  if (result[CLIENT_ID_KEY]) {
    return result[CLIENT_ID_KEY] as string;
  }
  const clientId = crypto.randomUUID();
  await chrome.storage.local.set({ [CLIENT_ID_KEY]: clientId });
  return clientId;
}

/** Get or create a session ID (resets after 30 min inactivity) */
async function getSessionId(): Promise<string> {
  const result = await chrome.storage.local.get([
    SESSION_ID_KEY,
    SESSION_START_KEY
  ]);
  const now = Date.now();
  const lastActivity = (result[SESSION_START_KEY] as number) ?? 0;

  if (result[SESSION_ID_KEY] && now - lastActivity < SESSION_TIMEOUT_MS) {
    await chrome.storage.local.set({ [SESSION_START_KEY]: now });
    return result[SESSION_ID_KEY] as string;
  }

  // New session
  const sessionId = String(Date.now());
  await chrome.storage.local.set({
    [SESSION_ID_KEY]: sessionId,
    [SESSION_START_KEY]: now
  });
  return sessionId;
}

/** Check if analytics is enabled (user opted in) */
export async function isAnalyticsEnabled(): Promise<boolean> {
  if (!GA_MEASUREMENT_ID || !GA_API_SECRET) return false;
  const settings = await getSettings();
  return settings.analyticsOptIn?.enabled === true;
}

/** Send a GA4 event via Measurement Protocol */
export async function trackEvent(
  name: string,
  params: EventParams = {}
): Promise<void> {
  const enabled = await isAnalyticsEnabled();
  if (!enabled) return;

  try {
    const [clientId, sessionId] = await Promise.all([
      getClientId(),
      getSessionId()
    ]);

    const body = {
      client_id: clientId,
      events: [
        {
          name,
          params: {
            session_id: sessionId,
            engagement_time_msec: '100',
            ...params
          }
        }
      ]
    };

    await fetch(MP_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  } catch {
    // Silently ignore analytics failures — never disrupt the user
  }
}

/** Track a feature usage event */
export async function trackFeatureUse(
  feature: string,
  isPremium = false
): Promise<void> {
  const params: EventParams = { feature };
  if (isPremium) {
    params.is_premium = true;
  }
  await trackEvent('use_feature', params);
}

/** Track an error event */
export async function trackError(type: string): Promise<void> {
  await trackEvent('error', { type });
}

/** Send a daily_active event (called from background alarm) */
export async function sendDailyActive(): Promise<void> {
  const enabled = await isAnalyticsEnabled();
  if (!enabled) return;

  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    return;
  }

  const settings = await getSettings();
  const version = chrome.runtime.getManifest().version;
  const language = settings.language ?? getCurrentLanguage();
  const isPremium = false; // Determined at call site if needed

  await trackEvent('daily_active', {
    version,
    language,
    user_type: isPremium ? 'premium' : 'free'
  });
}
