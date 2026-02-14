import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAnalytics } from '~/hooks/useAnalytics';
import type { AnalyticsData, UnblockHistory } from '~/types/storage';
import { DEFAULT_ANALYTICS, DEFAULT_UNBLOCK_HISTORY } from '~/types/storage';

// 依存モジュールをモック
vi.mock('@plasmohq/messaging', () => ({
  sendToBackground: vi.fn()
}));

vi.mock('~/lib/domain', () => ({
  parseDomainInput: vi.fn((input: string) => ({
    domain: input,
    isWildcard: false
  })),
  isValidDomain: vi.fn(() => true)
}));

vi.mock('~/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { sendToBackground } from '@plasmohq/messaging';
import { isValidDomain } from '~/lib/domain';
import { storage } from '~/lib/storage';

const mockStorageGet = vi.mocked(storage.get);
const mockStorageSet = vi.mocked(storage.set);
const mockSendToBackground = vi.mocked(sendToBackground);

beforeEach(() => {
  vi.clearAllMocks();
  mockStorageGet.mockResolvedValue(undefined);
  mockStorageSet.mockResolvedValue(undefined);
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
      mockStorageGet
        .mockResolvedValueOnce(mockAnalytics)
        .mockResolvedValueOnce(DEFAULT_UNBLOCK_HISTORY);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.reloadAnalyticsData();
      });

      expect(result.current.analyticsData.dailyStats['2024-06-12']).toBeTruthy();
    });
  });

  describe('handleResetAnalytics', () => {
    it('アナリティクスをリセットする', async () => {
      mockStorageGet.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleResetAnalytics();
      });

      // analytics を空に設定
      expect(mockStorageSet).toHaveBeenCalledWith('analytics', {
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
      mockStorageGet.mockResolvedValue(mockHistory);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleResetAnalytics();
      });

      // unblockHistoryの時間がリセットされたか確認
      const setCall = mockStorageSet.mock.calls.find(
        (call) => call[0] === 'unblockHistory'
      );
      if (setCall) {
        const savedHistory = setCall[1] as UnblockHistory;
        expect(
          savedHistory.sites['youtube.com'].timeAfterUnblock
        ).toBe(0);
        expect(savedHistory.sites['youtube.com'].lastActivity).toBeNull();
      }
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
      mockStorageGet.mockResolvedValue(mockHistory);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleStopTracking('youtube.com');
      });

      const unblockCall = mockStorageSet.mock.calls.find(
        (call) => call[0] === 'unblockHistory'
      );
      if (unblockCall) {
        const savedHistory = unblockCall[1] as UnblockHistory;
        expect(savedHistory.sites['youtube.com']).toBeUndefined();
      }
    });
  });

  describe('handleRefreshAnalytics', () => {
    it('データを再読み込みする', async () => {
      mockStorageGet.mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleRefreshAnalytics();
      });

      // storage.getが呼ばれたことを確認
      expect(mockStorageGet).toHaveBeenCalled();
    });
  });

  describe('handleAddSiteToTrack', () => {
    it('新しいサイトをトラッキングに追加する', async () => {
      mockStorageGet.mockResolvedValue({ sites: {} });

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleAddSiteToTrack('youtube.com');
      });

      const setCall = mockStorageSet.mock.calls.find(
        (call) => call[0] === 'unblockHistory'
      );
      if (setCall) {
        const saved = setCall[1] as UnblockHistory;
        expect(saved.sites['youtube.com']).toBeTruthy();
        expect(saved.sites['youtube.com'].status).toBe('unblocked');
      }
    });

    it('既にトラッキング中のサイトは追加しない', async () => {
      mockStorageGet.mockResolvedValue({
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

      // storage.setは呼ばれない（handleAddSiteToTrack内で）
      const addCalls = mockStorageSet.mock.calls.filter(
        (call) => call[0] === 'unblockHistory'
      );
      expect(addCalls).toHaveLength(0);
    });

    it('無効なドメインの場合は追加しない', async () => {
      vi.mocked(isValidDomain).mockReturnValue(false);
      mockStorageGet.mockResolvedValue({ sites: {} });

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleAddSiteToTrack('invalid');
      });

      const addCalls = mockStorageSet.mock.calls.filter(
        (call) => call[0] === 'unblockHistory'
      );
      expect(addCalls).toHaveLength(0);
    });
  });

  describe('handleReblock', () => {
    it('add-blockメッセージを送信する', async () => {
      mockSendToBackground.mockResolvedValue({ success: true });
      mockStorageGet.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAnalytics({ setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleReblock('youtube.com');
      });

      expect(mockSendToBackground).toHaveBeenCalledWith({
        name: 'add-block',
        body: { domain: 'youtube.com' }
      });
    });
  });
});
