import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAnalytics } from '~/hooks/useAnalytics';
import type { UnblockHistory } from '~/types/storage';
import { DEFAULT_SETTINGS, DEFAULT_UNBLOCK_HISTORY } from '~/types/storage';

// 依存モジュールをモック
vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/domain', () => ({
  parseDomainInput: vi.fn((input: string) => ({
    domain: input,
    isWildcard: false
  })),
  isValidDomain: vi.fn(() => true)
}));

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getUnblockHistory: vi.fn(),
  unblockHistoryItem: {
    setValue: vi.fn()
  }
}));

import { sendMessage } from '~/lib/messaging';
import { isValidDomain } from '~/lib/domain';
import {
  getSettings,
  getUnblockHistory,
  unblockHistoryItem
} from '~/lib/storage';

const mockGetUnblockHistory = vi.mocked(getUnblockHistory);
const mockSetUnblockHistory = vi.mocked(unblockHistoryItem.setValue);
const mockSendMessage = vi.mocked(sendMessage);

beforeEach(() => {
  vi.clearAllMocks();
  // 未保存のときの読み出しは項目定義の fallback（既定値）になる
  mockGetUnblockHistory.mockResolvedValue(DEFAULT_UNBLOCK_HISTORY);
  vi.mocked(getSettings).mockResolvedValue(DEFAULT_SETTINGS);
  mockSetUnblockHistory.mockResolvedValue(undefined);
});

describe('useAnalytics', () => {
  const mockSetSettings = vi.fn();

  describe('初期状態', () => {
    it('旧い集計（analytics）は画面へ返さない', () => {
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );
      expect(result.current).not.toHaveProperty('analyticsData');
    });

    it('デフォルトのアンブロック履歴で開始する', () => {
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );
      expect(result.current.unblockHistory).toEqual(DEFAULT_UNBLOCK_HISTORY);
    });
  });

  describe('reloadAnalyticsData', () => {
    it('ストレージから解除履歴を読み込む', async () => {
      const history = {
        sites: {
          'example.com': {
            domain: 'example.com',
            status: 'unblocked' as const,
            blockedAt: '2024-06-01T00:00:00.000Z',
            unblockedAt: '2024-06-02T00:00:00.000Z',
            timeAfterUnblock: 0,
            lastActivity: null
          }
        }
      };
      mockGetUnblockHistory.mockResolvedValue(history);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.reloadAnalyticsData();
      });

      expect(result.current.unblockHistory).toEqual(history);
    });
  });

  describe('handleResetAnalytics', () => {
    it('事実の表の消去を background に依頼する', async () => {
      // 事実の表の書き手は background だけ。画面から直接書くと加算と競合して消える
      mockSendMessage.mockResolvedValue({ success: true });
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleResetAnalytics();
      });

      expect(mockSendMessage).toHaveBeenCalledWith('reset-activity');
    });

    it('追跡中のサイトの一覧（解除履歴）は書き換えない', async () => {
      mockSendMessage.mockResolvedValue({ success: true });
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleResetAnalytics();
      });

      expect(mockSetUnblockHistory).not.toHaveBeenCalled();
    });

    it('依頼に失敗しても例外を画面へ投げない', async () => {
      mockSendMessage.mockRejectedValue(new Error('送信失敗'));
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await expect(
        act(async () => {
          await result.current.handleResetAnalytics();
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('handleStopTracking', () => {
    it('ドメインをアンブロック履歴から削除する', async () => {
      const mockHistory: UnblockHistory = {
        sites: {
          'youtube.com': {
            domain: 'youtube.com',
            status: 'unblocked',
            blockedAt: '2024-01-01T00:00:00Z',
            unblockedAt: '2024-02-01T00:00:00Z',
            timeAfterUnblock: 0,
            lastActivity: null
          }
        }
      };
      mockGetUnblockHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleStopTracking('youtube.com');
      });

      const savedHistory = mockSetUnblockHistory.mock.calls[0][0];
      expect(savedHistory.sites['youtube.com']).toBeUndefined();
    });
  });

  describe('handleRefreshAnalytics', () => {
    it('データを再読み込みする', async () => {
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleRefreshAnalytics();
      });

      // 解除履歴を読み直す（数値は activity から導出する）
      expect(mockGetUnblockHistory).toHaveBeenCalled();
    });
  });

  describe('handleAddSiteToTrack', () => {
    it('新しいサイトをトラッキングに追加する', async () => {
      mockGetUnblockHistory.mockResolvedValue({ sites: {} });

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleAddSiteToTrack('youtube.com');
      });

      const saved = mockSetUnblockHistory.mock.calls[0][0];
      expect(saved.sites['youtube.com']).toBeTruthy();
      expect(saved.sites['youtube.com'].status).toBe('unblocked');
    });

    it('未保存のときに読み出した既定値を書き換えない', async () => {
      // 共有の既定値を破壊すると、以降すべての呼び出し側に影響する
      mockGetUnblockHistory.mockResolvedValue(DEFAULT_UNBLOCK_HISTORY);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleAddSiteToTrack('youtube.com');
      });

      expect(DEFAULT_UNBLOCK_HISTORY.sites['youtube.com']).toBeUndefined();
    });

    it('既にトラッキング中のサイトは追加しない', async () => {
      mockGetUnblockHistory.mockResolvedValue({
        sites: {
          'youtube.com': {
            domain: 'youtube.com',
            status: 'unblocked',
            blockedAt: '2024-01-01T00:00:00Z',
            unblockedAt: '2024-02-01T00:00:00Z',
            timeAfterUnblock: 0,
            lastActivity: null
          }
        }
      });

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleAddSiteToTrack('youtube.com');
      });

      // 履歴への書き込みは起きない（handleAddSiteToTrack内で）
      expect(mockSetUnblockHistory).not.toHaveBeenCalled();
    });

    it('無効なドメインの場合は追加しない', async () => {
      vi.mocked(isValidDomain).mockReturnValue(false);
      mockGetUnblockHistory.mockResolvedValue({ sites: {} });

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleAddSiteToTrack('invalid');
      });

      expect(mockSetUnblockHistory).not.toHaveBeenCalled();
    });
  });

  describe('handleReblock', () => {
    it('add-blockメッセージを送信する', async () => {
      mockSendMessage.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleReblock('youtube.com');
      });

      expect(mockSendMessage).toHaveBeenCalledWith('add-block', {
        domain: 'youtube.com'
      });
    });
  });
});
