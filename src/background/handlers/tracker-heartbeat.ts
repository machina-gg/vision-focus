import type { MessageHandler } from '~/lib/messaging';
import { extractDomain } from '~/lib/domain';
import { TRACKER_CONFIG } from '~/constants/limits';
import { STALE_ENTRY_TIMEOUT_MS } from '~/constants/intervals';
import { checkTimeLimitNotification } from '../notifications';
import { getSiteBlockStatuses } from '~/lib/blockService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { TrackerHeartbeatBodySchema } from '~/types/messageSchemas';
import { recordHostActivity } from '~/lib/activityService';

// Track active pages and their last heartbeat
interface ActivePage {
  domain: string;
  lastHeartbeat: number;
  isActive: boolean;
}

// Store active pages (keyed by tab ID or URL)
const activePages = new Map<string, ActivePage>();

// Track recording timer
let recordingTimer: ReturnType<typeof setInterval> | null = null;

// Start the recording timer if not already running
function ensureRecordingTimer() {
  if (recordingTimer) return;

  recordingTimer = setInterval(async () => {
    const now = Date.now();
    const seconds = Math.floor(TRACKER_CONFIG.RECORDING_INTERVAL_MS / 1000);
    const visibleHosts: string[] = [];

    // 直近に heartbeat が届いた（表示中の）ページを集める
    for (const [_key, page] of activePages.entries()) {
      // Check if page is still active (received heartbeat recently)
      const timeSinceHeartbeat = now - page.lastHeartbeat;

      if (
        page.isActive &&
        timeSinceHeartbeat <= TRACKER_CONFIG.HEARTBEAT_TIMEOUT_MS
      ) {
        visibleHosts.push(page.domain);
      } else if (timeSinceHeartbeat > TRACKER_CONFIG.HEARTBEAT_TIMEOUT_MS) {
        // Page is stale, mark as inactive
        page.isActive = false;
      }
    }

    // Clean up stale entries (no heartbeat for over 1 minute)
    for (const [key, page] of activePages.entries()) {
      if (now - page.lastHeartbeat > STALE_ENTRY_TIMEOUT_MS) {
        activePages.delete(key);
      }
    }

    // Stop timer if no active pages
    if (activePages.size === 0 && recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }

    // 滞在時間を記録する経路はここだけ（ほかに書き手を足すと同じ時間が二重に数えられる）。
    // 表示中のページの滞在を、追跡中のサイトごとに 1 回分記録する
    // （同じサイトの別ホストを同時に表示していても 1 回分。解除中かどうかでは絞らない）
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

/**
 * 表示中のサイトのうち時間制限つきのものについて、残りが少なければ通知し、
 * 使い切ったらその場でルールを更新して開いているタブもブロックする
 * （ルールの更新だけでは新しい遷移しか塞がらない）
 */
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

// Message handler
export const trackerHeartbeatHandler: MessageHandler<
  'tracker-heartbeat'
> = async ({ data }) => {
  const parsed = TrackerHeartbeatBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Invalid request body' };
  }

  const { url, status, timestamp } = parsed.data;

  // Extract domain from URL
  const domain = extractDomain(url);
  if (!domain) {
    return { success: false, error: 'Invalid URL' };
  }

  // Create a unique key for this page
  const pageKey = domain; // Use domain as key (aggregate by domain)

  // Handle different status types
  switch (status) {
    case 'active':
      // Page became active
      activePages.set(pageKey, {
        domain,
        lastHeartbeat: timestamp || Date.now(),
        isActive: true
      });
      ensureRecordingTimer();
      break;

    case 'inactive': {
      // Page became inactive
      const inactivePage = activePages.get(pageKey);
      if (inactivePage) {
        inactivePage.isActive = false;
      }
      break;
    }

    case 'heartbeat': {
      // Regular heartbeat - update last heartbeat time
      const existingPage = activePages.get(pageKey);
      if (existingPage) {
        existingPage.lastHeartbeat = timestamp || Date.now();
        existingPage.isActive = true;
      } else {
        // New page, add it
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
