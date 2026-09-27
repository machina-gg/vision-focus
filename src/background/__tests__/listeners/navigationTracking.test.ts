import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/blockRecordService', () => ({
  recordBlockedDomain: vi.fn()
}));

vi.mock('~/lib/blockService', () => ({
  getBlockStateForDomain: vi.fn()
}));

import { recordBlockedDomain } from '~/lib/blockRecordService';
import { getBlockStateForDomain } from '~/lib/blockService';
import { setupNavigationTracking } from '../../listeners/navigationTracking';

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
  vi.mocked(getBlockStateForDomain).mockResolvedValue({
    blocked: true,
    reason: 'always_blocked'
  });
});

describe('setupNavigationTracking', () => {
  describe('計測する場合', () => {
    it.each([['always_blocked' as const], ['time_limit_exceeded' as const]])(
      '遷移先のドメインと、判定の理由（%s）をブロック記録に渡す',
      async (reason) => {
        vi.mocked(getBlockStateForDomain).mockResolvedValue({
          blocked: true,
          reason
        });
        setupNavigationTracking();

        await harness.navigate('https://example.com/page');

        expect(getBlockStateForDomain).toHaveBeenCalledWith('example.com');
        expect(recordBlockedDomain).toHaveBeenCalledWith('example.com', reason);
      }
    );

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

      expect(getBlockStateForDomain).not.toHaveBeenCalled();
      expect(recordBlockedDomain).not.toHaveBeenCalled();
    });

    it('ドメインを抽出できない URL は無視する', async () => {
      setupNavigationTracking();

      await harness.navigate('not-a-url');

      expect(getBlockStateForDomain).not.toHaveBeenCalled();
      expect(recordBlockedDomain).not.toHaveBeenCalled();
    });

    it('ブロック対象でないドメインは記録しない', async () => {
      vi.mocked(getBlockStateForDomain).mockResolvedValue({
        blocked: false,
        reason: null
      });
      setupNavigationTracking();

      await harness.navigate('https://allowed.com');

      expect(recordBlockedDomain).not.toHaveBeenCalled();
    });
  });
});
