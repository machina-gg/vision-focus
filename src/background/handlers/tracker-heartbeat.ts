import type { MessageHandler } from '~/lib/messaging';
import { extractDomain, matchesDomain } from '~/lib/domain';
import {
  getSettings,
  getUnblockHistory,
  setUnblockHistory
} from '~/lib/storage';
import type { BlockItem, UnblockHistory } from '~/types/storage';
import { TRACKER_CONFIG } from '~/constants/limits';
import { STALE_ENTRY_TIMEOUT_MS } from '~/constants/intervals';
import { recordTimeLimitUsage, findBlockItemForDomain } from '../time-limit';
import { checkTimeLimitNotification } from '../notifications';
import {
  recordYouTubeTimeLimitUsage,
  hasYouTubeExceededTimeLimit
} from '~/lib/youtubeBlockService';
import { checkYouTubeTimeLimitNotification } from '../notifications';
import { hasExceededTimeLimit } from '~/lib/timeLimitService';
import { getYouTubeBlockItem } from '~/lib/blockService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { TrackerHeartbeatBodySchema } from '~/types/messageSchemas';

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

    // Record time for all active pages
    for (const [_key, page] of activePages.entries()) {
      // Check if page is still active (received heartbeat recently)
      const timeSinceHeartbeat = now - page.lastHeartbeat;

      if (
        page.isActive &&
        timeSinceHeartbeat <= TRACKER_CONFIG.HEARTBEAT_TIMEOUT_MS
      ) {
        // Record 5 seconds of time for this page
        await recordTime(
          page.domain,
          Math.floor(TRACKER_CONFIG.RECORDING_INTERVAL_MS / 1000)
        );
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
  }, TRACKER_CONFIG.RECORDING_INTERVAL_MS);
}

// Normalize domain by removing www prefix
function normalizeDomain(domain: string): string {
  return domain.startsWith('www.') ? domain.slice(4) : domain;
}

// Check if two domains match (considering www variants)
function domainsMatch(domain1: string, domain2: string): boolean {
  return normalizeDomain(domain1) === normalizeDomain(domain2);
}

// Find matching unblocked site (supports wildcards and www variants)
// ⚠ 解除履歴は再ブロックしたエントリも保持し続けるため、
// 「履歴にある」ではなく status === 'unblocked' で絞る（#440）
function findUnblockedSite(
  domain: string,
  history: UnblockHistory
): string | null {
  const isUnblocked = (key: string): boolean =>
    history.sites[key]?.status === 'unblocked';

  // Direct match first
  if (isUnblocked(domain)) {
    return domain;
  }

  // Check all unblocked domains for matches
  for (const unblockedDomain of Object.keys(history.sites)) {
    if (!isUnblocked(unblockedDomain)) continue;
    // Create a BlockItem-like object for matching
    const blockItem: BlockItem = {
      id: '',
      domain: unblockedDomain,
      isWildcard: unblockedDomain.startsWith('*.'),
      createdAt: '',
      enabled: true
    };

    if (matchesDomain(domain, blockItem)) {
      return unblockedDomain;
    }

    // Check www variant match (youtube.com ↔ www.youtube.com)
    if (domainsMatch(domain, unblockedDomain)) {
      return unblockedDomain;
    }
  }

  return null;
}

// Record time for a domain (tracks time-limited sites and unblock history)
async function recordTime(domain: string, seconds: number): Promise<void> {
  if (seconds <= 0 || !domain) return;

  // Check if this domain has a time limit (record usage for time-limited sites)
  const blockItem = await findBlockItemForDomain(domain);
  if (blockItem && blockItem.timeLimit) {
    await recordTimeLimitUsage(domain, seconds);
    // Check if we need to send a notification about time running low
    await checkTimeLimitNotification(domain);

    // If time limit is now exceeded, update block rules immediately
    if (await hasExceededTimeLimit(domain, blockItem)) {
      await updateBlockRules();
      await blockExistingTabs();
    }
    // Don't return here - the unblock history is updated below as well
  }

  // YouTube-specific time limit recording
  const normalizedDomain = normalizeDomain(domain);
  if (normalizedDomain === 'youtube.com') {
    await recordYouTubeTimeLimitUsage(seconds);
    await checkYouTubeTimeLimitNotification();

    // 時間制限を超過したら、ブロックリストの項目と同じくその場でルールを更新し、
    // 開いているタブもブロックする。ルール更新だけでは新しい遷移しか塞がらない（#392）。
    // アクセスブロックが無効なら超過してもブロックされないため、仮想のブロック項目
    // （ブロック条件の SSOT）で先に振り分け、ルール再構築と全タブ走査を繰り返さない
    const youtubeItem = getYouTubeBlockItem(await getSettings());
    if (youtubeItem?.timeLimit && (await hasYouTubeExceededTimeLimit())) {
      await updateBlockRules();
      await blockExistingTabs();
    }
  }

  // Only track sites that are currently unblocked
  const history = await getUnblockHistory();
  const matchedDomain = findUnblockedSite(domain, history);

  if (!matchedDomain) {
    // Not an unblocked site, skip (but time limit was already recorded above)
    return;
  }

  const unblockedSite = history.sites[matchedDomain];

  // Update unblock history time
  // ⚠ analytics（siteTime / dailyStats）はここで更新しない。
  // 使用時間の記録者は src/background/tracker.ts の 1 本だけで、
  // 両方が書くと同じ滞在時間が二重に加算される（#440）
  unblockedSite.timeAfterUnblock += seconds;
  unblockedSite.lastActivity = new Date().toISOString();
  await setUnblockHistory(history);
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
