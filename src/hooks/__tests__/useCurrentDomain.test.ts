import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 依存モジュールをモック
vi.mock('@plasmohq/messaging', () => ({
  sendToBackground: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  getActiveTab: vi.fn()
}));

import { sendToBackground } from '@plasmohq/messaging';
import { getActiveTab } from '~/lib/chromeApi';
import { useCurrentDomain } from '~/hooks/useCurrentDomain';
import { DOMAIN_POLLING_MS } from '~/constants/intervals';

const timeLimitInfo = {
  hasTimeLimit: true,
  remainingSeconds: 300,
  limitType: 'daily' as const,
  limitSeconds: 1800
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getActiveTab).mockResolvedValue({
    url: 'https://example.com/page'
  } as chrome.tabs.Tab);
  vi.mocked(sendToBackground).mockResolvedValue({
    success: true,
    data: timeLimitInfo
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCurrentDomain', () => {
  it('アクティブタブの URL からドメインを抽出する', async () => {
    const { result } = renderHook(() => useCurrentDomain());

    await waitFor(() => {
      expect(result.current.currentDomain).toBe('example.com');
    });
  });

  it('時間制限情報を取得して保持する', async () => {
    const { result } = renderHook(() => useCurrentDomain());

    await waitFor(() => {
      expect(result.current.timeLimitInfo).toEqual(timeLimitInfo);
    });
    expect(sendToBackground).toHaveBeenCalledWith({
      name: 'get-remaining-time',
      body: { url: 'https://example.com/page' }
    });
  });

  it('clearDomain でドメインをクリアできる', async () => {
    const { result } = renderHook(() => useCurrentDomain());

    await waitFor(() => {
      expect(result.current.currentDomain).toBe('example.com');
    });

    act(() => {
      result.current.clearDomain();
    });

    expect(result.current.currentDomain).toBeUndefined();
  });

  describe('取得できない場合', () => {
    it('アクティブタブが無ければドメインは undefined のまま', async () => {
      vi.mocked(getActiveTab).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCurrentDomain());

      await waitFor(() => {
        expect(getActiveTab).toHaveBeenCalled();
      });
      expect(result.current.currentDomain).toBeUndefined();
      expect(sendToBackground).not.toHaveBeenCalled();
    });

    it('タブに URL が無ければ問い合わせを行わない', async () => {
      vi.mocked(getActiveTab).mockResolvedValue({} as chrome.tabs.Tab);

      renderHook(() => useCurrentDomain());

      await waitFor(() => {
        expect(getActiveTab).toHaveBeenCalled();
      });
      expect(sendToBackground).not.toHaveBeenCalled();
    });

    it('URL として解釈できない文字列では undefined にする', async () => {
      vi.mocked(getActiveTab).mockResolvedValue({
        url: 'not-a-url'
      } as chrome.tabs.Tab);

      const { result } = renderHook(() => useCurrentDomain());

      await waitFor(() => {
        expect(sendToBackground).toHaveBeenCalled();
      });
      expect(result.current.currentDomain).toBeUndefined();
    });

    // 既知の挙動: extractDomain は URL の hostname をそのまま返すため、
    // chrome:// などの内部ページでもドメイン扱いになる（ブロック対象としては不正）。
    // クイックブロックの入力欄に無意味な値が初期表示される問題につながる。
    it('chrome:// ページでは hostname がそのまま返る（既知の挙動）', async () => {
      vi.mocked(getActiveTab).mockResolvedValue({
        url: 'chrome://settings'
      } as chrome.tabs.Tab);

      const { result } = renderHook(() => useCurrentDomain());

      await waitFor(() => {
        expect(result.current.currentDomain).toBe('settings');
      });
    });

    it('background がエラーを返しても例外を投げず undefined を保つ', async () => {
      vi.mocked(sendToBackground).mockRejectedValue(new Error('no receiver'));

      const { result } = renderHook(() => useCurrentDomain());

      await waitFor(() => {
        expect(sendToBackground).toHaveBeenCalled();
      });
      expect(result.current.timeLimitInfo).toBeNull();
    });

    it('レスポンスが success: false なら時間制限情報を更新しない', async () => {
      vi.mocked(sendToBackground).mockResolvedValue({
        success: false,
        error: 'Invalid URL'
      });

      const { result } = renderHook(() => useCurrentDomain());

      await waitFor(() => {
        expect(sendToBackground).toHaveBeenCalled();
      });
      expect(result.current.timeLimitInfo).toBeNull();
    });
  });

  describe('ポーリング', () => {
    it('一定間隔で再取得する', async () => {
      vi.useFakeTimers();

      renderHook(() => useCurrentDomain());

      await vi.advanceTimersByTimeAsync(0);
      expect(getActiveTab).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(DOMAIN_POLLING_MS);
      expect(getActiveTab).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(DOMAIN_POLLING_MS);
      expect(getActiveTab).toHaveBeenCalledTimes(3);
    });

    it('アンマウント後は再取得しない', async () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() => useCurrentDomain());

      await vi.advanceTimersByTimeAsync(0);
      unmount();
      vi.mocked(getActiveTab).mockClear();

      await vi.advanceTimersByTimeAsync(DOMAIN_POLLING_MS * 3);

      expect(getActiveTab).not.toHaveBeenCalled();
    });
  });
});
