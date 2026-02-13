import type { PlasmoCSConfig } from 'plasmo';

import { Storage } from '@plasmohq/storage';

import type { YouTubeSettings, TimeLimitUsage } from '~/types/storage';
import { DEFAULT_YOUTUBE_SETTINGS } from '~/types/storage';
import {
  AnalyticsDataSchema,
  YouTubeSettingsSchema
} from '~/types/messageSchemas';

// Run only on YouTube
export const config: PlasmoCSConfig = {
  matches: ['*://*.youtube.com/*'],
  run_at: 'document_start'
};

// Storage instance
const storage = new Storage({ area: 'local' });

// CSS selectors for YouTube elements
const SELECTORS = {
  // Shorts
  shortsShelf: 'ytd-rich-shelf-renderer[is-shorts]',
  shortsTab: 'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
  shortsSection: 'ytd-reel-shelf-renderer',
  shortsSidebarTab:
    'ytd-guide-entry-renderer a[title="Shorts"], ytd-guide-entry-renderer a[href="/shorts"]',

  // Recommendations (Home page)
  // ホームフィードの動画一覧を確実に非表示にするため、複数のセレクタを使用
  homeFeed: 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
  homeFeedContents: 'ytd-browse[page-subtype="home"] #contents',
  homeChips: 'ytd-feed-filter-chip-bar-renderer',

  // Recommendations (Watch page)
  relatedVideos: '#related',
  endScreen: '.ytp-endscreen-content',
  autoplayToggle: '.ytp-autonav-toggle-button',

  // Comments
  comments: 'ytd-comments#comments',
  liveChat: 'ytd-live-chat-frame#chat',

  // Sidebar (related videos on watch page)
  sidebar: '#secondary #related',
  secondaryInner: '#secondary-inner'
} as const;

// Current settings
let currentSettings: YouTubeSettings = DEFAULT_YOUTUBE_SETTINGS;
let timeLimitExceeded = false;
let styleElement: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;

// Check if the YouTube time limit has been exceeded based on usage data
function checkTimeLimitExceeded(
  settings: YouTubeSettings,
  usage: TimeLimitUsage | undefined
): boolean {
  if (!settings.enabled || !settings.timeLimit || !usage) {
    return false;
  }

  const { type, limitSeconds } = settings.timeLimit;

  // Check if daily/hourly reset is needed
  const now = new Date();
  const todayKey = now.toISOString().split('T')[0];
  const hourKey = `${todayKey}-${now.getHours().toString().padStart(2, '0')}`;

  let usedSeconds: number;
  if (type === 'daily') {
    usedSeconds =
      usage.lastDailyReset === todayKey ? usage.dailyUsedSeconds : 0;
  } else {
    usedSeconds =
      usage.lastHourlyReset === hourKey ? usage.hourlyUsedSeconds : 0;
  }

  return usedSeconds >= limitSeconds;
}

// Generate CSS based on current settings
function generateCSS(settings: YouTubeSettings): string {
  if (!settings.enabled) {
    return '';
  }

  // When blockAccess is true, the background script handles the redirect
  // via declarativeNetRequest rules, so no CSS hiding is needed
  if (settings.blockAccess) {
    return '';
  }

  const rules: string[] = [];

  // If time limit is exceeded, hide all content
  if (timeLimitExceeded) {
    rules.push(`
      /* Time limit exceeded - hide all YouTube content */
      ytd-app #content {
        display: none !important;
      }
      ytd-app::after {
        content: 'YouTube time limit reached. Take a break!';
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        color: var(--yt-spec-text-secondary, #606060);
        font-size: 20px;
        font-weight: 500;
        text-align: center;
        padding: 40px;
      }
    `);
    return rules.join('\n');
  }

  if (settings.hideShorts) {
    rules.push(`
      /* Hide Shorts shelf on home page */
      ${SELECTORS.shortsShelf},
      ${SELECTORS.shortsSection},
      /* Hide Shorts tab in navigation */
      ${SELECTORS.shortsTab},
      ${SELECTORS.shortsSidebarTab},
      /* Hide Shorts in search results */
      ytd-video-renderer[is-shorts] {
        display: none !important;
      }
    `);
  }

  if (settings.hideRecommendations) {
    // Note: This selector intentionally overlaps with hideSidebar setting.
    // hideRecommendations targets end screen + sidebar related videos + autoplay.
    // hideSidebar only targets sidebar related videos (no end screen/autoplay).
    // This allows users to hide end screen without hiding sidebar if desired.
    rules.push(`
      /* Hide end screen recommendations */
      ${SELECTORS.endScreen} {
        display: none !important;
      }
      /* Hide related videos in sidebar */
      ytd-watch-flexy ${SELECTORS.relatedVideos},
      ytd-watch-flexy ${SELECTORS.secondaryInner} #related {
        display: none !important;
      }
      /* Hide autoplay toggle button */
      ${SELECTORS.autoplayToggle} {
        display: none !important;
      }
      /* Expand video player when recommendations are hidden */
      ytd-watch-flexy[flexy][is-two-columns_] #primary {
        max-width: 100% !important;
      }
    `);
  }

  if (settings.hideComments) {
    rules.push(`
      /* Hide comments section and live chat */
      ${SELECTORS.comments},
      ${SELECTORS.liveChat} {
        display: none !important;
      }
    `);
  }

  if (settings.hideSidebar) {
    rules.push(`
      /* Hide sidebar/related videos on watch page */
      ytd-watch-flexy ${SELECTORS.relatedVideos},
      ytd-watch-flexy ${SELECTORS.secondaryInner} #related {
        display: none !important;
      }
      /* Expand video player when sidebar is hidden */
      ytd-watch-flexy[flexy][is-two-columns_] #primary {
        max-width: 100% !important;
      }
    `);
  }

  if (settings.hideHomeFeed) {
    rules.push(`
      /* Hide home feed - show only search bar */
      ${SELECTORS.homeFeed},
      ${SELECTORS.homeFeedContents},
      ${SELECTORS.homeChips} {
        display: none !important;
      }
      /* Show a message instead */
      ytd-browse[page-subtype="home"]::after {
        content: 'ホームフィードが隠れています';
        display: block;
        text-align: center;
        padding: 100px 20px;
        color: var(--yt-spec-text-secondary);
        font-size: 16px;
      }
    `);
  }

  return rules.join('\n');
}

// Apply CSS to the page
function applyStyles(settings: YouTubeSettings): void {
  const css = generateCSS(settings);

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'vision-focus-youtube-blocker';
    const newStyleElement = styleElement;
    // Insert at document_start, so we need to wait for head
    const insertStyle = () => {
      if (document.head) {
        document.head.appendChild(newStyleElement);
      } else {
        requestAnimationFrame(insertStyle);
      }
    };
    insertStyle();
  }

  styleElement.textContent = css;
}

// Handle dynamic content (YouTube is an SPA)
function handleDynamicContent(): void {
  if (!currentSettings.enabled || timeLimitExceeded) return;

  // When blockAccess is true, the background script handles the redirect
  if (currentSettings.blockAccess) return;

  // Additional DOM manipulation for dynamic elements
  if (currentSettings.hideShorts) {
    // Remove Shorts from navigation dynamically
    document
      .querySelectorAll(SELECTORS.shortsSidebarTab)
      .forEach((el) => ((el as HTMLElement).style.display = 'none'));
  }

  if (currentSettings.hideRecommendations) {
    // Disable autoplay when recommendations are hidden
    const autoplayToggle = document.querySelector(
      SELECTORS.autoplayToggle
    ) as HTMLElement;
    if (autoplayToggle?.getAttribute('aria-checked') === 'true') {
      autoplayToggle.click();
    }
  }
}

// Setup MutationObserver for SPA navigation
function setupObserver(): void {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldUpdate = true;
        break;
      }
    }

    if (shouldUpdate) {
      handleDynamicContent();
    }
  });

  const newObserver = observer;
  // Observe body for changes (YouTube SPA updates)
  const startObserving = () => {
    if (document.body && newObserver) {
      newObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      requestAnimationFrame(startObserving);
    }
  };
  startObserving();
}

// Load analytics to check time limit
async function loadTimeLimitState(): Promise<void> {
  try {
    const raw = await storage.get('analytics');
    const parsed = AnalyticsDataSchema.safeParse(raw);
    if (!parsed.success) {
      timeLimitExceeded = false;
      return;
    }
    const usage = parsed.data.timeLimitUsage['youtube.com'];
    timeLimitExceeded = checkTimeLimitExceeded(currentSettings, usage);
  } catch {
    timeLimitExceeded = false;
  }
}

// Load settings from storage
async function loadSettings(): Promise<void> {
  try {
    const stored = await storage.get<Record<string, unknown> | null>(
      'settings'
    );
    if (stored && 'youtube' in stored) {
      const raw = stored.youtube;
      const parsed = YouTubeSettingsSchema.safeParse(raw);
      if (parsed.success) {
        currentSettings = parsed.data;
      }
    }
  } catch {
    // Use default settings on error
    currentSettings = DEFAULT_YOUTUBE_SETTINGS;
  }

  await loadTimeLimitState();
  applyStyles(currentSettings);
  handleDynamicContent();
}

// Watch for settings and analytics changes
function watchSettings(): void {
  storage.watch({
    settings: (change) => {
      if (change.newValue && typeof change.newValue === 'object') {
        const raw = (change.newValue as Record<string, unknown>).youtube;
        const parsed = YouTubeSettingsSchema.safeParse(raw);
        if (parsed.success) {
          currentSettings = parsed.data;
          // Re-check time limit when settings change (async IIFE to avoid .then)
          void (async () => {
            await loadTimeLimitState();
            applyStyles(currentSettings);
            handleDynamicContent();
          })();
        }
      }
    },
    analytics: (change) => {
      if (change.newValue && typeof change.newValue === 'object') {
        const parsed = AnalyticsDataSchema.safeParse(change.newValue);
        if (!parsed.success) return;
        const usage = parsed.data.timeLimitUsage['youtube.com'];
        const wasExceeded = timeLimitExceeded;
        timeLimitExceeded = checkTimeLimitExceeded(currentSettings, usage);

        if (wasExceeded !== timeLimitExceeded) {
          applyStyles(currentSettings);
        }
      }
    }
  });
}

// Initialize
async function init(): Promise<void> {
  await loadSettings();
  setupObserver();
  watchSettings();

  // Handle page navigation (YouTube SPA)
  window.addEventListener('yt-navigate-finish', () => {
    handleDynamicContent();
  });
}

// Start
init();
