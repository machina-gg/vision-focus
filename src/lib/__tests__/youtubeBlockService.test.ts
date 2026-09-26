import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn()
}));

import { getAnalytics, setAnalytics } from '~/lib/storage';
import {
  YOUTUBE_DOMAIN,
  incrementYouTubeBlockCount
} from '~/lib/youtubeBlockService';
import { DEFAULT_ANALYTICS } from '~/types/storage';

const mockGetAnalytics = vi.mocked(getAnalytics);
const mockSetAnalytics = vi.mocked(setAnalytics);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('YOUTUBE_DOMAIN', () => {
  it('youtube.comが定義されている', () => {
    expect(YOUTUBE_DOMAIN).toBe('youtube.com');
  });
});

describe('incrementYouTubeBlockCount', () => {
  it('ブロックカウントをインクリメントする', async () => {
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    mockSetAnalytics.mockResolvedValue(undefined);

    await incrementYouTubeBlockCount();

    expect(mockSetAnalytics).toHaveBeenCalledTimes(1);
    const saved = mockSetAnalytics.mock.calls[0][0];
    expect(saved.siteBlockCounts[YOUTUBE_DOMAIN].count).toBe(1);
  });

  it('既存カウントに加算する', async () => {
    mockGetAnalytics.mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      siteBlockCounts: {
        [YOUTUBE_DOMAIN]: {
          domain: YOUTUBE_DOMAIN,
          count: 5,
          lastBlocked: '2024-06-12T00:00:00Z'
        }
      }
    });
    mockSetAnalytics.mockResolvedValue(undefined);

    await incrementYouTubeBlockCount();

    const saved = mockSetAnalytics.mock.calls[0][0];
    expect(saved.siteBlockCounts[YOUTUBE_DOMAIN].count).toBe(6);
  });
});
