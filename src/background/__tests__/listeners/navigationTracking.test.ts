import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn(),
  incrementSiteBlockCount: vi.fn(),
  setLastBlockedDomain: vi.fn()
}));

vi.mock('~/lib/blockService', () => ({
  shouldTrackBlockForDomain: vi.fn()
}));

import {
  getAnalytics,
  setAnalytics,
  incrementSiteBlockCount,
  setLastBlockedDomain
} from '~/lib/storage';
import { shouldTrackBlockForDomain } from '~/lib/blockService';
import { setupNavigationTracking } from '../../listeners/navigationTracking';
import { DEFAULT_ANALYTICS } from '~/types/storage';

/** webNavigation リスナーを捕捉できる chrome モックを構築する */
function setupChrome() {
  let handler:
    | ((
        details: chrome.webNavigation.WebNavigationParentedCallbackDetails
      ) => Promise<void>)
    | null = null;

  (globalThis as Record<string, unknown>).chrome = {
    runtime: { id: 'test-extension-id' },
    webNavigation: {
      onBeforeNavigate: {
        addListener: vi.fn((fn) => {
          handler = fn;
        })
      }
    }
  };

  return {
    navigate: async (url: string, frameId = 0) => {
      if (!handler) throw new Error('リスナーが未登録');
      await handler({
        url,
        frameId,
        tabId: 1
      } as chrome.webNavigation.WebNavigationParentedCallbackDetails);
    }
  };
}

const TODAY = new Date().toISOString().slice(0, 10);

let harness: ReturnType<typeof setupChrome>;

beforeEach(() => {
  vi.clearAllMocks();
  harness = setupChrome();
  vi.mocked(getAnalytics).mockResolvedValue({
    ...DEFAULT_ANALYTICS,
    dailyStats: {}
  });
  vi.mocked(shouldTrackBlockForDomain).mockResolvedValue(true);
});

describe('setupNavigationTracking', () => {
  describe('計測する場合', () => {
    it('サイト別のブロック回数を増やす', async () => {
      setupNavigationTracking();

      await harness.navigate('https://example.com/page');

      expect(incrementSiteBlockCount).toHaveBeenCalledWith('example.com');
    });

    it('ポップアップ表示用に最後にブロックしたドメインを保存する', async () => {
      setupNavigationTracking();

      await harness.navigate('https://example.com/page');

      expect(setLastBlockedDomain).toHaveBeenCalledWith('example.com');
    });

    it('当日のブロック回数を 1 増やす', async () => {
      setupNavigationTracking();

      await harness.navigate('https://example.com');

      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyStats: expect.objectContaining({
            [TODAY]: expect.objectContaining({ blockCount: 1 })
          })
        })
      );
    });

    it('既存の当日集計に加算し、他の値を保持する', async () => {
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        dailyStats: {
          [TODAY]: {
            date: TODAY,
            wasteTime: 120,
            investTime: 300,
            blockCount: 4,
            unblockCount: 2
          }
        }
      });
      setupNavigationTracking();

      await harness.navigate('https://example.com');

      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyStats: expect.objectContaining({
            [TODAY]: {
              date: TODAY,
              wasteTime: 120,
              investTime: 300,
              blockCount: 5,
              unblockCount: 2
            }
          })
        })
      );
    });
  });

  describe('計測しない場合', () => {
    it('サブフレームのナビゲーションは無視する', async () => {
      setupNavigationTracking();

      await harness.navigate('https://example.com', 1);

      expect(shouldTrackBlockForDomain).not.toHaveBeenCalled();
      expect(incrementSiteBlockCount).not.toHaveBeenCalled();
    });

    it('ドメインを抽出できない URL は無視する', async () => {
      setupNavigationTracking();

      await harness.navigate('not-a-url');

      expect(shouldTrackBlockForDomain).not.toHaveBeenCalled();
      expect(incrementSiteBlockCount).not.toHaveBeenCalled();
    });

    it('ブロック対象でないドメインは記録しない', async () => {
      vi.mocked(shouldTrackBlockForDomain).mockResolvedValue(false);
      setupNavigationTracking();

      await harness.navigate('https://allowed.com');

      expect(incrementSiteBlockCount).not.toHaveBeenCalled();
      expect(setLastBlockedDomain).not.toHaveBeenCalled();
      expect(setAnalytics).not.toHaveBeenCalled();
    });
  });
});
