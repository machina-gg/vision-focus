import type { PlasmoCSConfig } from 'plasmo';

import { Storage } from '@plasmohq/storage';

import type { YouTubeSettings } from '~/types/storage';
import { DEFAULT_YOUTUBE_SETTINGS } from '~/types/storage';

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
  homeFeed: 'ytd-browse[page-subtype="home"] #contents',
  homeChips: 'ytd-feed-filter-chip-bar-renderer',

  // Recommendations (Watch page)
  relatedVideos: '#related',
  endScreen: '.ytp-endscreen-content',
  autoplayToggle: '.ytp-autonav-toggle-button',

  // Comments
  comments: 'ytd-comments#comments',

  // Sidebar (related videos on watch page)
  sidebar: '#secondary #related',
  secondaryInner: '#secondary-inner'
} as const;

// Current settings
let currentSettings: YouTubeSettings = DEFAULT_YOUTUBE_SETTINGS;
let styleElement: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;

// Generate CSS based on current settings
function generateCSS(settings: YouTubeSettings): string {
  if (!settings.enabled) {
    return '';
  }

  const rules: string[] = [];

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
    rules.push(`
      /* Hide end screen recommendations */
      ${SELECTORS.endScreen} {
        display: none !important;
      }
    `);
  }

  if (settings.hideComments) {
    rules.push(`
      /* Hide comments section */
      ${SELECTORS.comments} {
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
      ytd-browse[page-subtype="home"] ${SELECTORS.homeFeed},
      ytd-browse[page-subtype="home"] ${SELECTORS.homeChips} {
        display: none !important;
      }
      /* Show a message instead */
      ytd-browse[page-subtype="home"]::after {
        content: 'Home feed is hidden. Use search to find specific videos.';
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
  if (!currentSettings.enabled) return;

  // Additional DOM manipulation for dynamic elements
  if (currentSettings.hideShorts) {
    // Remove Shorts from navigation dynamically
    document
      .querySelectorAll(SELECTORS.shortsSidebarTab)
      .forEach((el) => ((el as HTMLElement).style.display = 'none'));
  }

  if (currentSettings.hideRecommendations && currentSettings.hideHomeFeed) {
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

// Load settings from storage
async function loadSettings(): Promise<void> {
  try {
    const stored = await storage.get('settings');
    if (stored && typeof stored === 'object' && 'youtube' in stored) {
      currentSettings = (stored as { youtube: YouTubeSettings }).youtube;
    }
  } catch {
    // Use default settings on error
    currentSettings = DEFAULT_YOUTUBE_SETTINGS;
  }

  applyStyles(currentSettings);
  handleDynamicContent();
}

// Watch for settings changes
function watchSettings(): void {
  storage.watch({
    settings: (change) => {
      if (change.newValue && typeof change.newValue === 'object') {
        const newSettings = change.newValue as { youtube?: YouTubeSettings };
        if (newSettings.youtube) {
          currentSettings = newSettings.youtube;
          applyStyles(currentSettings);
          handleDynamicContent();
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
