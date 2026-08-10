import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/storage', () => ({
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn(),
  getUnblockHistory: vi.fn(),
  setUnblockHistory: vi.fn()
}));

vi.mock('../../time-limit', () => ({
  recordTimeLimitUsage: vi.fn(),
  findBlockItemForDomain: vi.fn()
}));

vi.mock('../../notifications', () => ({
  checkTimeLimitNotification: vi.fn(),
  checkYouTubeTimeLimitNotification: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

vi.mock('~/lib/youtubeBlockService', () => ({
  recordYouTubeTimeLimitUsage: vi.fn()
}));

vi.mock('~/lib/timeLimitService', () => ({
  hasExceededTimeLimit: vi.fn()
}));

vi.mock('~/lib/time', () => ({
  getTodayKey: vi.fn(() => '2026-08-11')
}));

import {
  getAnalytics,
  setAnalytics,
  getUnblockHistory,
  setUnblockHistory
} from '~/lib/storage';
import { recordTimeLimitUsage, findBlockItemForDomain } from '../../time-limit';
import {
  checkTimeLimitNotification,
  checkYouTubeTimeLimitNotification
} from '../../notifications';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { recordYouTubeTimeLimitUsage } from '~/lib/youtubeBlockService';
import { hasExceededTimeLimit } from '~/lib/timeLimitService';
import { DEFAULT_ANALYTICS, DEFAULT_UNBLOCK_HISTORY } from '~/types/storage';
import { TRACKER_CONFIG } from '~/constants/limits';

interface Response {
  success: boolean;
  error?: string;
}

/**
 * ハンドラはモジュールレベルに activePages / recordingTimer の状態を持つため、
 * テストごとに resetModules して読み込み直す。
 */
async function loadHandler() {
  vi.resetModules();
  const mod = await import('../../messages/tracker-heartbeat');
  return mod.default;
}

const RECORDED_SECONDS = Math.floor(
  TRACKER_CONFIG.RECORDING_INTERVAL_MS / 1000
);

describe('tracker-heartbeat ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUnblockHistory).mockResolvedValue({
      ...DEFAULT_UNBLOCK_HISTORY,
      sites: {}
    });
    vi.mocked(getAnalytics).mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      siteTime: {},
      dailyStats: {}
    });
    vi.mocked(findBlockItemForDomain).mockResolvedValue(null);
    vi.mocked(hasExceededTimeLimit).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('入力検証', () => {
    it.each([
      ['url が空文字', { url: '', status: 'active' }],
      ['status が不正', { url: 'https://example.com', status: 'unknown' }],
      ['status が無い', { url: 'https://example.com' }],
      [
        'url が 2048 文字超',
        { url: `https://example.com/${'a'.repeat(2048)}`, status: 'active' }
      ],
      [
        'timestamp が負数',
        { url: 'https://example.com', status: 'active', timestamp: -1 }
      ]
    ])('%s なら Invalid request body を返す', async (_label, body) => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: 'Invalid request body'
      });
    });

    it('ドメインを抽出できない URL なら Invalid URL を返す', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'not-a-url',
        status: 'active'
      });

      expect(result).toEqual({ success: false, error: 'Invalid URL' });
    });
  });

  describe('ステータス処理', () => {
    it('active を受け付ける', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'https://example.com/page',
        status: 'active',
        timestamp: 1000
      });

      expect(result).toEqual({ success: true });
    });

    it('heartbeat を受け付ける', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'https://example.com',
        status: 'heartbeat'
      });

      expect(result).toEqual({ success: true });
    });

    it('未知のページに対する inactive でも成功を返す', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'https://example.com',
        status: 'inactive'
      });

      expect(result).toEqual({ success: true });
    });

    it('timestamp 省略時も受け付ける', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'https://example.com',
        status: 'heartbeat'
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('計測タイマー', () => {
    it('active 後、記録間隔ごとに時間を計測する', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-11T00:00:00.000Z'));
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      // 追跡対象（時間制限・解除履歴）でないため保存はされないが、
      // 計測対象の判定処理までは到達している
      expect(findBlockItemForDomain).toHaveBeenCalledWith('example.com');
    });

    it('inactive にすると計測されなくなる', async () => {
      vi.useFakeTimers();
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });
      await invoke(handler, {
        url: 'https://example.com',
        status: 'inactive'
      });

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(findBlockItemForDomain).not.toHaveBeenCalled();
    });

    it('ハートビートが途絶えると計測を止める', async () => {
      vi.useFakeTimers();
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });

      // ハートビートのタイムアウトを超えて放置する
      await vi.advanceTimersByTimeAsync(
        TRACKER_CONFIG.HEARTBEAT_TIMEOUT_MS +
          TRACKER_CONFIG.RECORDING_INTERVAL_MS
      );
      vi.mocked(findBlockItemForDomain).mockClear();

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(findBlockItemForDomain).not.toHaveBeenCalled();
    });
  });

  describe('時間制限付きサイトの計測', () => {
    it('時間制限付きサイトの利用時間を記録し通知を確認する', async () => {
      vi.useFakeTimers();
      vi.mocked(findBlockItemForDomain).mockResolvedValue({
        id: 'item-1',
        domain: 'example.com',
        isWildcard: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        enabled: true,
        timeLimit: { type: 'daily', limitSeconds: 1800 }
      });
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(recordTimeLimitUsage).toHaveBeenCalledWith(
        'example.com',
        RECORDED_SECONDS
      );
      expect(checkTimeLimitNotification).toHaveBeenCalledWith('example.com');
    });

    it('制限を超過したら即座にブロックルールを適用する', async () => {
      vi.useFakeTimers();
      vi.mocked(findBlockItemForDomain).mockResolvedValue({
        id: 'item-1',
        domain: 'example.com',
        isWildcard: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        enabled: true,
        timeLimit: { type: 'daily', limitSeconds: 1800 }
      });
      vi.mocked(hasExceededTimeLimit).mockResolvedValue(true);
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(updateBlockRules).toHaveBeenCalled();
      expect(blockExistingTabs).toHaveBeenCalled();
    });

    it('制限未超過ならブロックルールを再適用しない', async () => {
      vi.useFakeTimers();
      vi.mocked(findBlockItemForDomain).mockResolvedValue({
        id: 'item-1',
        domain: 'example.com',
        isWildcard: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        enabled: true,
        timeLimit: { type: 'daily', limitSeconds: 1800 }
      });
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(updateBlockRules).not.toHaveBeenCalled();
    });
  });

  describe('YouTube の計測', () => {
    it('youtube.com は専用の計測処理を通す', async () => {
      vi.useFakeTimers();
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://www.youtube.com/watch?v=abc',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      // www 有無を正規化して判定している
      expect(recordYouTubeTimeLimitUsage).toHaveBeenCalledWith(
        RECORDED_SECONDS
      );
      expect(checkYouTubeTimeLimitNotification).toHaveBeenCalled();
    });

    it('YouTube 以外では専用処理を呼ばない', async () => {
      vi.useFakeTimers();
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(recordYouTubeTimeLimitUsage).not.toHaveBeenCalled();
    });
  });

  describe('ブロック解除済みサイトの計測', () => {
    it('解除履歴のあるサイトは滞在時間と分析データを更新する', async () => {
      vi.useFakeTimers();
      vi.mocked(getUnblockHistory).mockResolvedValue({
        ...DEFAULT_UNBLOCK_HISTORY,
        sites: {
          'example.com': {
            domain: 'example.com',
            status: 'unblocked',
            blockedAt: '2026-01-01T00:00:00.000Z',
            unblockedAt: '2026-01-02T00:00:00.000Z',
            timeAfterUnblock: 100,
            lastActivity: null
          }
        }
      });
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(setUnblockHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sites: expect.objectContaining({
            'example.com': expect.objectContaining({
              timeAfterUnblock: 100 + RECORDED_SECONDS
            })
          })
        })
      );
      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          siteTime: expect.objectContaining({
            'example.com': expect.objectContaining({
              time: RECORDED_SECONDS,
              category: 'waste'
            })
          }),
          dailyStats: expect.objectContaining({
            '2026-08-11': expect.objectContaining({
              wasteTime: RECORDED_SECONDS
            })
          })
        })
      );
    });

    it('www 有無が異なっても解除履歴と突き合わせる', async () => {
      vi.useFakeTimers();
      vi.mocked(getUnblockHistory).mockResolvedValue({
        ...DEFAULT_UNBLOCK_HISTORY,
        sites: {
          'youtube.com': {
            domain: 'youtube.com',
            status: 'unblocked',
            blockedAt: '2026-01-01T00:00:00.000Z',
            unblockedAt: '2026-01-02T00:00:00.000Z',
            timeAfterUnblock: 0,
            lastActivity: null
          }
        }
      });
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://www.youtube.com/watch?v=abc',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(setUnblockHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sites: expect.objectContaining({
            'youtube.com': expect.objectContaining({
              timeAfterUnblock: RECORDED_SECONDS
            })
          })
        })
      );
    });

    it('解除履歴に無いサイトは分析データを更新しない', async () => {
      vi.useFakeTimers();
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(setUnblockHistory).not.toHaveBeenCalled();
      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('既存の当日集計に加算する', async () => {
      vi.useFakeTimers();
      vi.mocked(getUnblockHistory).mockResolvedValue({
        ...DEFAULT_UNBLOCK_HISTORY,
        sites: {
          'example.com': {
            domain: 'example.com',
            status: 'unblocked',
            blockedAt: '2026-01-01T00:00:00.000Z',
            unblockedAt: '2026-01-02T00:00:00.000Z',
            timeAfterUnblock: 0,
            lastActivity: null
          }
        }
      });
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        siteTime: {
          'example.com': {
            domain: 'example.com',
            time: 60,
            category: 'waste',
            lastUpdated: '2026-08-11T00:00:00.000Z'
          }
        },
        dailyStats: {
          '2026-08-11': {
            date: '2026-08-11',
            wasteTime: 120,
            investTime: 300,
            blockCount: 2,
            unblockCount: 1
          }
        }
      });
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(setAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          siteTime: expect.objectContaining({
            'example.com': expect.objectContaining({
              time: 60 + RECORDED_SECONDS
            })
          }),
          dailyStats: expect.objectContaining({
            '2026-08-11': expect.objectContaining({
              wasteTime: 120 + RECORDED_SECONDS,
              // 他の集計値は保持する
              investTime: 300,
              blockCount: 2,
              unblockCount: 1
            })
          })
        })
      );
    });
  });
});
