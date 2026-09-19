import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAnalytics } from '~/hooks/useAnalytics';
import type { AnalyticsData, UnblockHistory } from '~/types/storage';
import {
  DEFAULT_ANALYTICS,
  DEFAULT_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY
} from '~/types/storage';

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
  getAnalytics: vi.fn(),
  getSettings: vi.fn(),
  getUnblockHistory: vi.fn(),
  analyticsItem: {
    setValue: vi.fn()
  },
  unblockHistoryItem: {
    setValue: vi.fn()
  }
}));

import { sendMessage } from '~/lib/messaging';
import { isValidDomain } from '~/lib/domain';
import {
  analyticsItem,
  getAnalytics,
  getSettings,
  getUnblockHistory,
  unblockHistoryItem
} from '~/lib/storage';

const mockGetAnalytics = vi.mocked(getAnalytics);
const mockGetUnblockHistory = vi.mocked(getUnblockHistory);
const mockSetAnalytics = vi.mocked(analyticsItem.setValue);
const mockSetUnblockHistory = vi.mocked(unblockHistoryItem.setValue);
const mockSendMessage = vi.mocked(sendMessage);

beforeEach(() => {
  vi.clearAllMocks();
  // 未保存のときの読み出しは項目定義の fallback（既定値）になる
  mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
  mockGetUnblockHistory.mockResolvedValue(DEFAULT_UNBLOCK_HISTORY);
  vi.mocked(getSettings).mockResolvedValue(DEFAULT_SETTINGS);
  mockSetAnalytics.mockResolvedValue(undefined);
  mockSetUnblockHistory.mockResolvedValue(undefined);
});

describe('useAnalytics', () => {
  const mockSetSettings = vi.fn();

  describe('初期状態', () => {
    it('空のアナリティクスデータで開始する', () => {
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );
      expect(result.current.analyticsData.dailyStats).toEqual({});
      expect(result.current.analyticsData.siteTime).toEqual({});
    });

    it('デフォルトのアンブロック履歴で開始する', () => {
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );
      expect(result.current.unblockHistory).toEqual(DEFAULT_UNBLOCK_HISTORY);
    });
  });

  describe('reloadAnalyticsData', () => {
    it('ストレージからデータを読み込む', async () => {
      const mockAnalytics: AnalyticsData = {
        ...DEFAULT_ANALYTICS,
        dailyStats: {
          '2024-06-12': {
            date: '2024-06-12',
            wasteTime: 100,
            investTime: 50,
            blockCount: 5,
            unblockCount: 1
          }
        }
      };
      mockGetAnalytics.mockResolvedValue(mockAnalytics);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.reloadAnalyticsData();
      });

      expect(
        result.current.analyticsData.dailyStats['2024-06-12']
      ).toBeTruthy();
    });
  });

  describe('handleResetAnalytics', () => {
    it('アナリティクスをリセットする', async () => {
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleResetAnalytics();
      });

      // analytics を空に設定
      expect(mockSetAnalytics).toHaveBeenCalledWith({
        dailyStats: {},
        siteTime: {},
        siteCategories: {},
        siteBlockCounts: {},
        siteUnblockCounts: {},
        timeLimitUsage: {}
      });
    });

    it('アンブロック履歴の時間をリセットする', async () => {
      const mockHistory: UnblockHistory = {
        sites: {
          'youtube.com': {
            domain: 'youtube.com',
            status: 'unblocked',
            blockedAt: '2024-01-01T00:00:00Z',
            unblockedAt: '2024-02-01T00:00:00Z',
            timeAfterUnblock: 3600,
            lastActivity: '2024-06-12T00:00:00Z'
          }
        }
      };
      mockGetUnblockHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleResetAnalytics();
      });

      // unblockHistoryの時間がリセットされたか確認
      const savedHistory = mockSetUnblockHistory.mock.calls[0][0];
      expect(savedHistory.sites['youtube.com'].timeAfterUnblock).toBe(0);
      expect(savedHistory.sites['youtube.com'].lastActivity).toBeNull();
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

      // 保存済みデータの読み出しが呼ばれたことを確認
      expect(mockGetAnalytics).toHaveBeenCalled();
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
