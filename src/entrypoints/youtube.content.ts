import { defineContentScript } from '#imports';

import { sitesItem } from '~/lib/storage';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';

import type { TrackedSites, YouTubeFeatures } from '~/types/site';
import { YouTubeFeaturesSchema } from '~/types/messageSchemas';
import {
  YOUTUBE_SELECTORS,
  generateYouTubeHideCSS
} from '~/lib/youtubeHideStyles';

// youtube.com の YouTube 機能（null = 使わない）
let currentSettings: YouTubeFeatures | null = null;
let styleElement: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;

// Apply CSS to the page
function applyStyles(settings: YouTubeFeatures | null): void {
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
  if (!currentSettings) return;

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

/**
 * 追跡中のサイトから youtube.com の YouTube 機能を取り出す。
 * 形が崩れていれば機能を使わない（null）として扱う（壊れた値で CSS を組み立てない）
 */
function featuresOf(
  sites: TrackedSites | null | undefined
): YouTubeFeatures | null {
  const parsed = YouTubeFeaturesSchema.safeParse(
    sites?.[YOUTUBE_DOMAIN]?.youtube
  );
  return parsed.success ? parsed.data : null;
}

// Load settings from storage
async function loadSettings(): Promise<void> {
  try {
    currentSettings = featuresOf(await sitesItem.getValue());
  } catch {
    currentSettings = null;
  }

  applyStyles(currentSettings);
  handleDynamicContent();
}

// Watch for settings changes
function watchSettings(): void {
  const unwatchSettings = sitesItem.watch((newSites) => {
    currentSettings = featuresOf(newSites);
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
