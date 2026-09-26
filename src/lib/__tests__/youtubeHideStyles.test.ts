import { describe, it, expect } from 'vitest';

import {
  YOUTUBE_SELECTORS,
  generateYouTubeHideCSS
} from '~/lib/youtubeHideStyles';
import { youtubeFeatures } from '~/test/sites';

describe('generateYouTubeHideCSS', () => {
  it('YouTube 機能を使わない（null）なら CSS を返さない', () => {
    expect(generateYouTubeHideCSS(null)).toBe('');
  });

  it('非表示の項目が 1 つも無ければ CSS を返さない', () => {
    expect(generateYouTubeHideCSS(youtubeFeatures())).toBe('');
  });

  // 1 日の制限を併用すると上限までは YouTube を開けるため、非表示の CSS はアクセスブロックを見ずに生成する
  it('すべての項目をオンにすると各セレクタを含める', () => {
    const css = generateYouTubeHideCSS(
      youtubeFeatures({
        hideShorts: true,
        hideRecommendations: true,
        hideComments: true,
        hideHomeFeed: true
      })
    );

    expect(css).toContain(YOUTUBE_SELECTORS.shortsShelf);
    expect(css).toContain(YOUTUBE_SELECTORS.relatedVideos);
    expect(css).toContain(YOUTUBE_SELECTORS.comments);
    expect(css).toContain(YOUTUBE_SELECTORS.homeFeed);
  });

  it('オンにした項目のセレクタだけを含める', () => {
    const css = generateYouTubeHideCSS(youtubeFeatures({ hideShorts: true }));

    expect(css).toContain(YOUTUBE_SELECTORS.shortsSidebarTab);
    expect(css).not.toContain(YOUTUBE_SELECTORS.comments);
    expect(css).not.toContain(YOUTUBE_SELECTORS.endScreen);
    expect(css).not.toContain(YOUTUBE_SELECTORS.homeChips);
  });

  it('ホームフィード非表示では代わりに出す文言を差し込む', () => {
    const css = generateYouTubeHideCSS(youtubeFeatures({ hideHomeFeed: true }));

    // chrome.i18n が無い環境では getMessage がキーをそのまま返す
    expect(css).toContain("content: 'youtubeHomeFeedHidden'");
  });
});
