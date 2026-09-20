import { describe, it, expect } from 'vitest';

import {
  YOUTUBE_SELECTORS,
  generateYouTubeHideCSS
} from '~/lib/youtubeHideStyles';
import { DEFAULT_YOUTUBE_SETTINGS } from '~/types/storage';
import type { YouTubeSettings } from '~/types/storage';

function makeSettings(overrides: Partial<YouTubeSettings>): YouTubeSettings {
  return { ...DEFAULT_YOUTUBE_SETTINGS, ...overrides };
}

describe('generateYouTubeHideCSS', () => {
  it('YouTube 機能が無効なら CSS を返さない', () => {
    const css = generateYouTubeHideCSS(
      makeSettings({
        enabled: false,
        hideShorts: true,
        hideRecommendations: true,
        hideComments: true,
        hideHomeFeed: true
      })
    );

    expect(css).toBe('');
  });

  it('有効でも非表示の項目が 1 つも無ければ CSS を返さない', () => {
    const css = generateYouTubeHideCSS(makeSettings({ enabled: true }));

    expect(css).toBe('');
  });

  // #422: アクセスブロックに 1 日の制限を併用していると上限までは YouTube を開けるため、
  // blockAccess が true でも非表示の CSS は生成される必要がある
  it.each([false, true])(
    'blockAccess が %s でも非表示の CSS を生成する',
    (blockAccess) => {
      const css = generateYouTubeHideCSS(
        makeSettings({
          enabled: true,
          blockAccess,
          hideShorts: true,
          hideRecommendations: true,
          hideComments: true,
          hideHomeFeed: true,
          timeLimit: { type: 'daily', limitSeconds: 300 }
        })
      );

      expect(css).toContain(YOUTUBE_SELECTORS.shortsShelf);
      expect(css).toContain(YOUTUBE_SELECTORS.relatedVideos);
      expect(css).toContain(YOUTUBE_SELECTORS.comments);
      expect(css).toContain(YOUTUBE_SELECTORS.homeFeed);
    }
  );

  it('オンにした項目のセレクタだけを含める', () => {
    const css = generateYouTubeHideCSS(
      makeSettings({ enabled: true, blockAccess: true, hideShorts: true })
    );

    expect(css).toContain(YOUTUBE_SELECTORS.shortsSidebarTab);
    expect(css).not.toContain(YOUTUBE_SELECTORS.comments);
    expect(css).not.toContain(YOUTUBE_SELECTORS.endScreen);
    expect(css).not.toContain(YOUTUBE_SELECTORS.homeChips);
  });

  it('ホームフィード非表示では代わりに出す文言を差し込む', () => {
    const css = generateYouTubeHideCSS(
      makeSettings({ enabled: true, hideHomeFeed: true })
    );

    // chrome.i18n が無い環境では getMessage がキーをそのまま返す
    expect(css).toContain("content: 'youtubeHomeFeedHidden'");
  });
});
