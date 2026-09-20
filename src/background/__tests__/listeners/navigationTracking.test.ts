import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/blockRecordService', () => ({
  recordBlockedDomain: vi.fn()
}));

vi.mock('~/lib/blockService', () => ({
  shouldTrackBlockForDomain: vi.fn()
}));

import { recordBlockedDomain } from '~/lib/blockRecordService';
import { shouldTrackBlockForDomain } from '~/lib/blockService';
import { setupNavigationTracking } from '../../listeners/navigationTracking';

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

let harness: ReturnType<typeof setupChrome>;

beforeEach(() => {
  vi.clearAllMocks();
  harness = setupChrome();
  vi.mocked(shouldTrackBlockForDomain).mockResolvedValue(true);
});

describe('setupNavigationTracking', () => {
  describe('計測する場合', () => {
    it('遷移先のドメインをブロック記録に渡す', async () => {
      setupNavigationTracking();

      await harness.navigate('https://example.com/page');

      expect(recordBlockedDomain).toHaveBeenCalledWith('example.com');
    });

    it('記録は 1 回の遷移につき 1 回だけ行う', async () => {
      setupNavigationTracking();

      await harness.navigate('https://example.com/page');

      expect(recordBlockedDomain).toHaveBeenCalledOnce();
    });
  });

  describe('計測しない場合', () => {
    it('サブフレームのナビゲーションは無視する', async () => {
      setupNavigationTracking();

      await harness.navigate('https://example.com', 1);

      expect(shouldTrackBlockForDomain).not.toHaveBeenCalled();
      expect(recordBlockedDomain).not.toHaveBeenCalled();
    });

    it('ドメインを抽出できない URL は無視する', async () => {
      setupNavigationTracking();

      await harness.navigate('not-a-url');

      expect(shouldTrackBlockForDomain).not.toHaveBeenCalled();
      expect(recordBlockedDomain).not.toHaveBeenCalled();
    });

    it('ブロック対象でないドメインは記録しない', async () => {
      vi.mocked(shouldTrackBlockForDomain).mockResolvedValue(false);
      setupNavigationTracking();

      await harness.navigate('https://allowed.com');

      expect(recordBlockedDomain).not.toHaveBeenCalled();
    });
  });
});
