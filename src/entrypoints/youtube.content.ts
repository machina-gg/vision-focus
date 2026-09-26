import { defineContentScript } from '#imports';

import { sitesItem } from '~/lib/storage';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';

import type { TrackedSites, YouTubeFeatures } from '~/types/site';
import { YouTubeFeaturesSchema } from '~/types/messageSchemas';
import {
  YOUTUBE_SELECTORS,
  generateYouTubeHideCSS
} from '~/lib/youtubeHideStyles';

let currentSettings: YouTubeFeatures | null = null;
let styleElement: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;

function applyStyles(settings: YouTubeFeatures | null): void {
  const css = generateYouTubeHideCSS(settings);

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'vision-focus-youtube-blocker';
    const newStyleElement = styleElement;
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

function handleDynamicContent(): void {
  if (!currentSettings) return;

  if (currentSettings.hideShorts) {
    document
      .querySelectorAll(YOUTUBE_SELECTORS.shortsSidebarTab)
      .forEach((el) => ((el as HTMLElement).style.display = 'none'));
  }

  if (currentSettings.hideRecommendations) {
    const autoplayToggle = document.querySelector(
      YOUTUBE_SELECTORS.autoplayToggle
    ) as HTMLElement;
    if (autoplayToggle?.getAttribute('aria-checked') === 'true') {
      autoplayToggle.click();
    }
  }
}

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

function featuresOf(
  sites: TrackedSites | null | undefined
): YouTubeFeatures | null {
  const parsed = YouTubeFeaturesSchema.safeParse(
    sites?.[YOUTUBE_DOMAIN]?.youtube
  );
  return parsed.success ? parsed.data : null;
}

async function loadSettings(): Promise<void> {
  try {
    currentSettings = featuresOf(await sitesItem.getValue());
  } catch {
    currentSettings = null;
  }

  applyStyles(currentSettings);
  handleDynamicContent();
}

function watchSettings(): void {
  const unwatchSettings = sitesItem.watch((newSites) => {
    currentSettings = featuresOf(newSites);
    applyStyles(currentSettings);
    handleDynamicContent();
  });

  // persisted は bfcache に入るだけで復帰しうるので、解除すると復帰後に設定へ追従できなくなる
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;

    unwatchSettings();
    observer?.disconnect();
  });
}

async function init(): Promise<void> {
  await loadSettings();
  setupObserver();
  watchSettings();

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
