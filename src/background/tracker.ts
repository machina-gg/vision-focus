import { extractDomain } from '~/lib/domain';
import { getAnalytics, setAnalytics } from '~/lib/storage';
import { getTodayKey } from '~/lib/time';
import { TRACKING_UPDATE_INTERVAL_MS } from '~/constants/intervals';
import type { DailyStat, SiteTime } from '~/types/storage';

let activeTabId: number | null = null;
let activeDomain: string | null = null;
let lastUpdateTime: number = Date.now();
let trackingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * ブラウザのウィンドウが前面にあるか。
 *
 * ⚠ 記録に関わる経路はすべてこの 1 つの変数を見る（#440）。
 * 経路ごとにフォーカスを問い合わせる形にすると、必ずどこかの経路が漏れる
 * （heartbeat 由来の `blockExistingTabs()` が `chrome.tabs.update` を呼び、
 * それが `tabs.onUpdated` として届く経路が実例）。
 * 初期値は false（実状態を取りに行くまでは記録しない側に倒す）
 */
let isBrowserFocused = false;

// Start tracking
// ⚠ service worker が起きるたびに呼ばれる（src/background/init.ts）ので、
// 何度呼ばれてもタイマーとリスナーが 1 組だけになるよう、先に今のぶんを畳む。
// Chrome が同一参照のリスナーを重複登録しないかどうかに依存しない（#440）
export function startTracking(): void {
  stopTracking();

  // 一定間隔で、前回の書き出しからの経過時間をまとめて記録する
  trackingInterval = setInterval(updateTracking, TRACKING_UPDATE_INTERVAL_MS);

  // Listen for tab changes
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
  chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);

  // Initialize with current focus state and tab
  void initializeFocusAndTab();
}

// Stop tracking
export function stopTracking(): void {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }

  // 実状態を取り直すまでは記録しない側に倒す
  isBrowserFocused = false;

  chrome.tabs.onActivated.removeListener(handleTabActivated);
  chrome.tabs.onUpdated.removeListener(handleTabUpdated);
  chrome.windows.onFocusChanged.removeListener(handleWindowFocusChanged);
}

/**
 * 計測対象を消す。
 *
 * ⚠ `activeTabId` も一緒に消す。これを残すと、前面でない間に届いた
 * `tabs.onUpdated`（heartbeat 由来の `blockExistingTabs()` による
 * ブロック画面へのリダイレクト等）が「アクティブタブの URL 変更」として
 * 通り、見ていない時間が加算され続ける（#440）
 */
function clearTrackingTarget(): void {
  activeTabId = null;
  activeDomain = null;
}

/**
 * フォーカス状態と計測対象を chrome へ問い合わせて初期化する。
 *
 * ⚠ service worker が起きるたびに通る。起動直後はフォーカスのイベントが
 * 来ないため、ここで一度だけ実状態を取りに行く（#440）
 */
async function initializeFocusAndTab(): Promise<void> {
  try {
    const lastFocused = await chrome.windows.getLastFocused();
    isBrowserFocused = lastFocused.focused === true;
  } catch {
    // 問い合わせに失敗したら記録しない側に倒す
    isBrowserFocused = false;
  }

  await initializeCurrentTab();
}

// Initialize with current active tab
async function initializeCurrentTab(): Promise<void> {
  if (!isBrowserFocused) {
    clearTrackingTarget();
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    // ⚠ await の間にフォーカスが落ちていることがある。代入の直前に確かめ直す。
    // 入口の判定だけだと、一度消した計測対象が遅れて解決した結果で復活し、
    // 前面に戻ったあとに不在期間まで加算される（#440）
    if (!isBrowserFocused) {
      clearTrackingTarget();
      return;
    }

    if (tab?.id && tab?.url) {
      activeTabId = tab.id;
      activeDomain = extractDomain(tab.url);
      lastUpdateTime = Date.now();
    }
  } catch {
    // Silently handle error - tracking will start on next tab activation
  }
}

// Handle tab activation
async function handleTabActivated(
  activeInfo: chrome.tabs.TabActiveInfo
): Promise<void> {
  if (!isContextValid()) return;

  // Save time for previous tab
  await saveElapsedTime();

  // ⚠ 前面でないときは計測対象にしない（#440）
  if (!isBrowserFocused) {
    clearTrackingTarget();
    return;
  }

  // Update to new tab
  activeTabId = activeInfo.tabId;

  let domain: string | null = null;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    domain = tab.url ? extractDomain(tab.url) : null;
  } catch {
    domain = null;
  }

  // ⚠ await の間にフォーカスが落ちていることがある。代入の直前に確かめ直す。
  // 入口の判定だけだと、一度消した計測対象が遅れて解決した結果で復活し、
  // 前面に戻ったあとに不在期間まで加算される（#440）
  if (!isBrowserFocused) {
    clearTrackingTarget();
    return;
  }

  activeDomain = domain;
  lastUpdateTime = Date.now();
}

// Handle tab URL updates
async function handleTabUpdated(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  _tab: chrome.tabs.Tab
): Promise<void> {
  if (!isContextValid()) return;
  if (tabId !== activeTabId || !changeInfo.url) return;

  // Save time for previous domain
  await saveElapsedTime();

  // ⚠ 前面でないときは計測対象にしない（#440）
  if (!isBrowserFocused) {
    clearTrackingTarget();
    return;
  }

  // Update to new domain
  activeDomain = extractDomain(changeInfo.url);
  lastUpdateTime = Date.now();
}

// Handle window focus changes
async function handleWindowFocusChanged(windowId: number): Promise<void> {
  if (!isContextValid()) return;

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, save time
    // ⚠ 先に書き出してから状態を落とす（前面だった間の時間は残す）
    await saveElapsedTime();
    isBrowserFocused = false;
    clearTrackingTarget();
  } else {
    // Browser gained focus, get current tab
    isBrowserFocused = true;
    await initializeCurrentTab();
  }
}

// Check if extension context is still valid
function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

// Update tracking (called on every TRACKING_UPDATE_INTERVAL_MS tick)
async function updateTracking(): Promise<void> {
  // ⚠ 最後の歯止め。イベントの取りこぼしや、ハンドラが await している最中の
  // フォーカス喪失で計測対象が残っても、前面でない間は記録しない（#440）
  if (!isBrowserFocused || !activeDomain || !isContextValid()) return;

  const now = Date.now();
  const elapsed = Math.floor((now - lastUpdateTime) / 1000);

  if (elapsed >= 1) {
    try {
      await recordTime(activeDomain, elapsed);
      lastUpdateTime = now;
    } catch {
      // Extension context invalidated, stop tracking
      if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
      }
    }
  }
}

// Save elapsed time for current domain
async function saveElapsedTime(): Promise<void> {
  if (!activeDomain || !isContextValid()) return;

  const now = Date.now();
  const elapsed = Math.floor((now - lastUpdateTime) / 1000);

  if (elapsed > 0) {
    try {
      await recordTime(activeDomain, elapsed);
    } catch {
      // Extension context invalidated, ignore
    }
  }
}

// Record time for a domain
// 使用時間（siteTime）と日次集計（dailyStats）を書くのはこの関数だけ。
// heartbeat 側からも書くと同じ滞在時間が二重に加算される（#440）
async function recordTime(domain: string, seconds: number): Promise<void> {
  if (seconds <= 0) return;

  const analytics = await getAnalytics();
  const todayKey = getTodayKey();

  // Update site time
  const existingSiteTime = analytics.siteTime[domain];
  const category = analytics.siteCategories[domain] || 'neutral';

  const updatedSiteTime: SiteTime = {
    domain,
    time: (existingSiteTime?.time || 0) + seconds,
    category,
    lastUpdated: new Date().toISOString()
  };
  analytics.siteTime[domain] = updatedSiteTime;

  // Update daily stats
  const existingDailyStat = analytics.dailyStats[todayKey];
  const updatedDailyStat: DailyStat = {
    date: todayKey,
    wasteTime:
      (existingDailyStat?.wasteTime || 0) +
      (category === 'waste' ? seconds : 0),
    investTime:
      (existingDailyStat?.investTime || 0) +
      (category === 'invest' ? seconds : 0),
    blockCount: existingDailyStat?.blockCount || 0,
    unblockCount: existingDailyStat?.unblockCount || 0
  };
  analytics.dailyStats[todayKey] = updatedDailyStat;

  await setAnalytics(analytics);
}

// Increment block count for today
export async function incrementBlockCount(): Promise<void> {
  const analytics = await getAnalytics();
  const todayKey = getTodayKey();

  const existingDailyStat = analytics.dailyStats[todayKey];
  const updatedDailyStat: DailyStat = {
    date: todayKey,
    wasteTime: existingDailyStat?.wasteTime || 0,
    investTime: existingDailyStat?.investTime || 0,
    blockCount: (existingDailyStat?.blockCount || 0) + 1,
    unblockCount: existingDailyStat?.unblockCount || 0
  };
  analytics.dailyStats[todayKey] = updatedDailyStat;

  await setAnalytics(analytics);
}

// Set category for a domain
export async function setSiteCategory(
  domain: string,
  category: 'waste' | 'invest' | 'neutral'
): Promise<void> {
  const analytics = await getAnalytics();
  analytics.siteCategories[domain] = category;

  // Update existing site time if it exists
  if (analytics.siteTime[domain]) {
    analytics.siteTime[domain].category = category;
  }

  await setAnalytics(analytics);
}

// Get today's stats
export async function getTodayStats(): Promise<DailyStat> {
  const analytics = await getAnalytics();
  const todayKey = getTodayKey();

  return (
    analytics.dailyStats[todayKey] || {
      date: todayKey,
      wasteTime: 0,
      investTime: 0,
      blockCount: 0,
      unblockCount: 0
    }
  );
}
