import { defineContentScript } from '#imports';

import { settingsItem } from '~/lib/storage';

import type { YouTubeSettings } from '~/types/storage';
import { DEFAULT_YOUTUBE_SETTINGS } from '~/types/storage';
import { YouTubeSettingsSchema } from '~/types/messageSchemas';
import {
  YOUTUBE_SELECTORS,
  generateYouTubeHideCSS
} from '~/lib/youtubeHideStyles';

// Current settings
let currentSettings: YouTubeSettings = DEFAULT_YOUTUBE_SETTINGS;
let styleElement: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;

// Apply CSS to the page
function applyStyles(settings: YouTubeSettings): void {
  const css = generateYouTubeHideCSS(settings);

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
      .querySelectorAll(YOUTUBE_SELECTORS.shortsSidebarTab)
      .forEach((el) => ((el as HTMLElement).style.display = 'none'));
  }

  if (currentSettings.hideRecommendations) {
    // Disable autoplay when recommendations are hidden
    const autoplayToggle = document.querySelector(
      YOUTUBE_SELECTORS.autoplayToggle
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
    const stored = await settingsItem.getValue();
    const parsed = YouTubeSettingsSchema.safeParse(stored?.youtube);
    if (parsed.success) {
      currentSettings = parsed.data;
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
  const unwatchSettings = settingsItem.watch((newSettings) => {
    const parsed = YouTubeSettingsSchema.safeParse(newSettings?.youtube);
    if (!parsed.success) return;

    currentSettings = parsed.data;
    applyStyles(currentSettings);
    handleDynamicContent();
  });

  // ページが破棄されるときに監視を解除する。
  // event.persisted が true のときは bfcache に入るだけで後から復帰しうるため、
  // 解除すると復帰後に設定変更へ追従できなくなる
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;

    unwatchSettings();
    observer?.disconnect();
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

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_start',
  main() {
    init();
  }
});
