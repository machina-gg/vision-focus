// 計測に個人データ（ドメイン・目標・閲覧履歴）を含めない

import { getSettings } from '~/lib/storage';
import { getUILanguage } from '~/lib/i18n';
import { isExtensionContextValid } from '~/lib/chromeApi';

// WXT は WXT_ / VITE_ 接頭辞の環境変数だけをビルド時に埋め込む（.env.example 参照）
const GA_MEASUREMENT_ID = import.meta.env.WXT_GA_MEASUREMENT_ID ?? '';
const GA_API_SECRET = import.meta.env.WXT_GA_API_SECRET ?? '';
const MP_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
const CLIENT_ID_KEY = 'ga_client_id';
const SESSION_ID_KEY = 'ga_session_id';
const SESSION_START_KEY = 'ga_session_start';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

interface EventParams {
  [key: string]: string | number | boolean;
}

async function getClientId(): Promise<string> {
  const result = await chrome.storage.local.get(CLIENT_ID_KEY);
  if (result[CLIENT_ID_KEY]) {
    return result[CLIENT_ID_KEY] as string;
  }
  const clientId = crypto.randomUUID();
  await chrome.storage.local.set({ [CLIENT_ID_KEY]: clientId });
  return clientId;
}

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

  const sessionId = String(Date.now());
  await chrome.storage.local.set({
    [SESSION_ID_KEY]: sessionId,
    [SESSION_START_KEY]: now
  });
  return sessionId;
}

// 計測の可否を読むストレージアクセスもこの中で行う（外に出すと、結果を捨てる呼び出し側で未処理の rejection になる）
async function runSilently(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    // 記録できないことは利用者に見せない（機能が使えないこととは別）
  }
}

export async function isAnalyticsEnabled(): Promise<boolean> {
  if (!GA_MEASUREMENT_ID || !GA_API_SECRET) return false;
  const settings = await getSettings();
  return settings.analyticsOptIn?.enabled === true;
}

export async function trackEvent(
  name: string,
  params: EventParams = {}
): Promise<void> {
  await runSilently(async () => {
    const enabled = await isAnalyticsEnabled();
    if (!enabled) return;

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
  });
}

export async function trackFeatureUse(feature: string): Promise<void> {
  await runSilently(() => trackEvent('use_feature', { feature }));
}

export async function trackError(type: string): Promise<void> {
  await runSilently(() => trackEvent('error', { type }));
}

export async function sendDailyActive(): Promise<void> {
  await runSilently(async () => {
    const enabled = await isAnalyticsEnabled();
    if (!enabled) return;

    if (!isExtensionContextValid()) {
      return;
    }

    const version = chrome.runtime.getManifest().version;
    const language = getUILanguage();

    await trackEvent('daily_active', { version, language });
  });
}
