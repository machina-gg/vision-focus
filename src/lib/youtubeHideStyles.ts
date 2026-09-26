/**
 * YouTube の「非表示」設定から注入する CSS を組み立てる
 *
 * コンテンツスクリプト（`src/entrypoints/youtube.content.ts`）から使う。
 * DOM にも chrome API にも触れない純粋関数なので、単体テストで固定できる。
 */

import type { YouTubeFeatures } from '~/types/site';
import { getMessage } from '~/lib/i18n';

// CSS selectors for YouTube elements
export const YOUTUBE_SELECTORS = {
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

  // 動画再生ページのサイドバー領域（hideRecommendations のルールから使う）
  secondaryInner: '#secondary-inner'
} as const;

/**
 * youtube.com の YouTube 機能から非表示用の CSS を生成する（null = 機能を使わない）
 *
 * ⚠ アクセスブロック（youtube.com の `block`）は見ない。アクセスブロックに 1 日の制限を
 * 併用していると上限までは YouTube を開けるため、ブロック ON でも非表示は効いている必要がある
 * （リダイレクトされるページでは CSS が効く前に遷移するので害は無い）
 */
export function generateYouTubeHideCSS(
  settings: YouTubeFeatures | null
): string {
  if (!settings) {
    return '';
  }

  const rules: string[] = [];

  if (settings.hideShorts) {
    rules.push(`
      /* Hide Shorts shelf on home page */
      ${YOUTUBE_SELECTORS.shortsShelf},
      ${YOUTUBE_SELECTORS.shortsSection},
      /* Hide Shorts tab in navigation */
      ${YOUTUBE_SELECTORS.shortsTab},
      ${YOUTUBE_SELECTORS.shortsSidebarTab},
      /* Hide Shorts in search results */
      ytd-video-renderer[is-shorts] {
        display: none !important;
      }
    `);
  }

  if (settings.hideRecommendations) {
    rules.push(`
      /* Hide end screen recommendations */
      ${YOUTUBE_SELECTORS.endScreen} {
        display: none !important;
      }
      /* Hide related videos in sidebar */
      ytd-watch-flexy ${YOUTUBE_SELECTORS.relatedVideos},
      ytd-watch-flexy ${YOUTUBE_SELECTORS.secondaryInner} #related {
        display: none !important;
      }
      /* Hide autoplay toggle button */
      ${YOUTUBE_SELECTORS.autoplayToggle} {
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
      ${YOUTUBE_SELECTORS.comments},
      ${YOUTUBE_SELECTORS.liveChat} {
        display: none !important;
      }
    `);
  }

  if (settings.hideHomeFeed) {
    const homeFeedHiddenMessage = getMessage('youtubeHomeFeedHidden');
    rules.push(`
      /* Hide home feed - show only search bar */
      ${YOUTUBE_SELECTORS.homeFeed},
      ${YOUTUBE_SELECTORS.homeFeedContents},
      ${YOUTUBE_SELECTORS.homeChips} {
        display: none !important;
      }
      /* Show a message instead */
      ytd-browse[page-subtype="home"]::after {
        content: '${homeFeedHiddenMessage}';
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
