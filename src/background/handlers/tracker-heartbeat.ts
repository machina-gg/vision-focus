import type { MessageHandler } from '~/lib/messaging';
import { extractDomain } from '~/lib/domain';
import { TRACKER_CONFIG } from '~/constants/limits';
import { STALE_ENTRY_TIMEOUT_MS } from '~/constants/intervals';
import { checkTimeLimitNotification } from '../notifications';
import { getSiteBlockStatuses } from '~/lib/blockService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { TrackerHeartbeatBodySchema } from '~/types/messageSchemas';
import { recordHostActivity } from '~/lib/activityService';

interface ActivePage {
  domain: string;
  lastHeartbeat: number;
  isActive: boolean;
}

const activePages = new Map<string, ActivePage>();

let recordingTimer: ReturnType<typeof setInterval> | null = null;

function ensureRecordingTimer() {
  if (recordingTimer) return;

  recordingTimer = setInterval(async () => {
    const now = Date.now();
    const seconds = Math.floor(TRACKER_CONFIG.RECORDING_INTERVAL_MS / 1000);
    const visibleHosts: string[] = [];

    for (const [_key, page] of activePages.entries()) {
      const timeSinceHeartbeat = now - page.lastHeartbeat;

      if (
        page.isActive &&
        timeSinceHeartbeat <= TRACKER_CONFIG.HEARTBEAT_TIMEOUT_MS
      ) {
        visibleHosts.push(page.domain);
      } else if (timeSinceHeartbeat > TRACKER_CONFIG.HEARTBEAT_TIMEOUT_MS) {
        page.isActive = false;
      }
    }

    for (const [key, page] of activePages.entries()) {
      if (now - page.lastHeartbeat > STALE_ENTRY_TIMEOUT_MS) {
        activePages.delete(key);
      }
    }

    if (activePages.size === 0 && recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }

    // 滞在時間の書き手はここだけにする（ほかに足すと同じ時間が二重に数えられる）
    const at = new Date();
    await recordHostActivity(visibleHosts, (site) => ({
      kind: 'stay',
      site,
      seconds,
      at
    }));

    // 時間制限の使用量は上で書いた今日の行なので、記録の後に判定する
    await enforceTimeLimits(visibleHosts);
  }, TRACKER_CONFIG.RECORDING_INTERVAL_MS);
}

// ルールの更新だけでは新しい遷移しか塞がらないので、開いているタブもブロックする
async function enforceTimeLimits(hosts: readonly string[]): Promise<void> {
  const statuses = await getSiteBlockStatuses(hosts);
  let exceeded = false;
  for (const status of statuses) {
    if (!status.rule.timeLimit) continue;
    await checkTimeLimitNotification(status);
    if (status.state.blocked) exceeded = true;
  }
  if (exceeded) {
    await updateBlockRules();
    await blockExistingTabs();
  }
}

/**
 * tracker-heartbeat: コンテンツスクリプトからページの表示状態を受け、表示中のサイトの滞在時間を一定間隔で記録して時間制限を判定する
 * @param message data.url にページの URL、data.status に状態（active / inactive / heartbeat）、data.timestamp に送信時刻（エポックからのミリ秒）
 * @returns 成功か、失敗の種類（invalid-request / invalid-url）
 */
export const trackerHeartbeatHandler: MessageHandler<
  'tracker-heartbeat'
> = async ({ data }) => {
  const parsed = TrackerHeartbeatBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const { url, status, timestamp } = parsed.data;

  const domain = extractDomain(url);
  if (!domain) {
    return { success: false, error: { code: 'invalid-url' } };
  }

  const pageKey = domain;

  switch (status) {
    case 'active':
      activePages.set(pageKey, {
        domain,
        lastHeartbeat: timestamp || Date.now(),
        isActive: true
      });
      ensureRecordingTimer();
      break;

    case 'inactive': {
      const inactivePage = activePages.get(pageKey);
      if (inactivePage) {
        inactivePage.isActive = false;
      }
      break;
    }

    case 'heartbeat': {
      const existingPage = activePages.get(pageKey);
      if (existingPage) {
        existingPage.lastHeartbeat = timestamp || Date.now();
        existingPage.isActive = true;
      } else {
        activePages.set(pageKey, {
          domain,
          lastHeartbeat: timestamp || Date.now(),
          isActive: true
        });
        ensureRecordingTimer();
      }
      break;
    }
  }

  return { success: true };
};
