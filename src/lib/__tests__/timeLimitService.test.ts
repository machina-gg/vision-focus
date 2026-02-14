import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  getOrCreateUsage,
  getEffectiveUsage,
  checkTimeLimitExceeded,
  calculateRemainingTime
} from '~/lib/timeLimitService';
import type { AnalyticsData, TimeLimitUsage, TimeLimit } from '~/types/storage';
import { DEFAULT_ANALYTICS } from '~/types/storage';

// time モジュールをモック
vi.mock('~/lib/time', () => ({
  getTodayKey: vi.fn(() => '2024-06-12'),
  getCurrentHourKey: vi.fn(() => '2024-06-12-12'),
  needsDailyReset: vi.fn(() => false),
  needsHourlyReset: vi.fn(() => false),
  isWithinSchedule: vi.fn(() => true)
}));

// storage モジュールをモック
vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn()
}));

// blockService のモック（循環参照回避）
vi.mock('~/lib/blockService', () => ({
  findEnabledBlockItemForDomain: vi.fn()
}));

import { needsDailyReset, needsHourlyReset } from '~/lib/time';
import { getAnalytics, setAnalytics } from '~/lib/storage';
import { findEnabledBlockItemForDomain } from '~/lib/blockService';

import {
  hasExceededTimeLimit,
  getRemainingTime,
  recordTimeLimitUsage,
  resetExpiredUsage,
  getTimeLimitInfo
} from '~/lib/timeLimitService';

const mockNeedsDailyReset = vi.mocked(needsDailyReset);
const mockNeedsHourlyReset = vi.mocked(needsHourlyReset);
const mockGetAnalytics = vi.mocked(getAnalytics);
const mockSetAnalytics = vi.mocked(setAnalytics);
const mockFindEnabledBlockItemForDomain = vi.mocked(
  findEnabledBlockItemForDomain
);

beforeEach(() => {
  vi.clearAllMocks();
  mockNeedsDailyReset.mockReturnValue(false);
  mockNeedsHourlyReset.mockReturnValue(false);
});

describe('getOrCreateUsage', () => {
  it('既存の使用量データがあればそれを返す', () => {
    const usage: TimeLimitUsage = {
      domain: 'youtube.com',
      dailyUsedSeconds: 100,
      hourlyUsedSeconds: 50,
      lastDailyReset: '2024-06-12',
      lastHourlyReset: '2024-06-12-12'
    };
    const analytics: AnalyticsData = {
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: { 'youtube.com': usage }
    };
    const result = getOrCreateUsage('youtube.com', analytics);
    expect(result).toEqual(usage);
  });

  it('データがない場合は新しい使用量データを生成する', () => {
    const analytics = { ...DEFAULT_ANALYTICS };
    const result = getOrCreateUsage('youtube.com', analytics);
    expect(result.domain).toBe('youtube.com');
    expect(result.dailyUsedSeconds).toBe(0);
    expect(result.hourlyUsedSeconds).toBe(0);
  });
});

describe('getEffectiveUsage', () => {
  it('リセット不要な場合はそのまま返す', () => {
    const usage: TimeLimitUsage = {
      domain: 'youtube.com',
      dailyUsedSeconds: 100,
      hourlyUsedSeconds: 50,
      lastDailyReset: '2024-06-12',
      lastHourlyReset: '2024-06-12-12'
    };
    const result = getEffectiveUsage(usage);
    expect(result.dailyUsedSeconds).toBe(100);
    expect(result.hourlyUsedSeconds).toBe(50);
    expect(result.wasReset).toBe(false);
  });

  it('日次リセットが必要な場合はdailyを0にする', () => {
    mockNeedsDailyReset.mockReturnValue(true);
    const usage: TimeLimitUsage = {
      domain: 'youtube.com',
      dailyUsedSeconds: 100,
      hourlyUsedSeconds: 50,
      lastDailyReset: '2024-06-11',
      lastHourlyReset: '2024-06-12-12'
    };
    const result = getEffectiveUsage(usage);
    expect(result.dailyUsedSeconds).toBe(0);
    expect(result.hourlyUsedSeconds).toBe(50);
    expect(result.wasReset).toBe(true);
  });

  it('時間リセットが必要な場合はhourlyを0にする', () => {
    mockNeedsHourlyReset.mockReturnValue(true);
    const usage: TimeLimitUsage = {
      domain: 'youtube.com',
      dailyUsedSeconds: 100,
      hourlyUsedSeconds: 50,
      lastDailyReset: '2024-06-12',
      lastHourlyReset: '2024-06-12-11'
    };
    const result = getEffectiveUsage(usage);
    expect(result.dailyUsedSeconds).toBe(100);
    expect(result.hourlyUsedSeconds).toBe(0);
    expect(result.wasReset).toBe(true);
  });

  it('両方リセットが必要な場合は両方0にする', () => {
    mockNeedsDailyReset.mockReturnValue(true);
    mockNeedsHourlyReset.mockReturnValue(true);
    const usage: TimeLimitUsage = {
      domain: 'youtube.com',
      dailyUsedSeconds: 100,
      hourlyUsedSeconds: 50,
      lastDailyReset: '2024-06-11',
      lastHourlyReset: '2024-06-12-11'
    };
    const result = getEffectiveUsage(usage);
    expect(result.dailyUsedSeconds).toBe(0);
    expect(result.hourlyUsedSeconds).toBe(0);
    expect(result.wasReset).toBe(true);
  });
});

describe('checkTimeLimitExceeded', () => {
  it('日次リミット超過の場合trueを返す', () => {
    const analytics: AnalyticsData = {
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 3600,
          hourlyUsedSeconds: 0,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    };
    const timeLimit: TimeLimit = { type: 'daily', limitSeconds: 3600 };
    expect(checkTimeLimitExceeded('youtube.com', timeLimit, analytics)).toBe(
      true
    );
  });

  it('日次リミット未超過の場合falseを返す', () => {
    const analytics: AnalyticsData = {
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 1800,
          hourlyUsedSeconds: 0,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    };
    const timeLimit: TimeLimit = { type: 'daily', limitSeconds: 3600 };
    expect(checkTimeLimitExceeded('youtube.com', timeLimit, analytics)).toBe(
      false
    );
  });

  it('時間リミット超過の場合trueを返す', () => {
    const analytics: AnalyticsData = {
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 0,
          hourlyUsedSeconds: 1800,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    };
    const timeLimit: TimeLimit = { type: 'hourly', limitSeconds: 1800 };
    expect(checkTimeLimitExceeded('youtube.com', timeLimit, analytics)).toBe(
      true
    );
  });

  it('使用量データがない場合はfalseを返す', () => {
    const timeLimit: TimeLimit = { type: 'daily', limitSeconds: 3600 };
    expect(
      checkTimeLimitExceeded('youtube.com', timeLimit, DEFAULT_ANALYTICS)
    ).toBe(false);
  });
});

describe('calculateRemainingTime', () => {
  it('残り時間を正しく計算する（日次）', () => {
    const analytics: AnalyticsData = {
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 1000,
          hourlyUsedSeconds: 0,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    };
    const timeLimit: TimeLimit = { type: 'daily', limitSeconds: 3600 };
    expect(calculateRemainingTime('youtube.com', timeLimit, analytics)).toBe(
      2600
    );
  });

  it('残り時間を正しく計算する（時間）', () => {
    const analytics: AnalyticsData = {
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 0,
          hourlyUsedSeconds: 600,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    };
    const timeLimit: TimeLimit = { type: 'hourly', limitSeconds: 1800 };
    expect(calculateRemainingTime('youtube.com', timeLimit, analytics)).toBe(
      1200
    );
  });

  it('超過している場合は0を返す', () => {
    const analytics: AnalyticsData = {
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 5000,
          hourlyUsedSeconds: 0,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    };
    const timeLimit: TimeLimit = { type: 'daily', limitSeconds: 3600 };
    expect(calculateRemainingTime('youtube.com', timeLimit, analytics)).toBe(0);
  });
});

describe('hasExceededTimeLimit', () => {
  it('ブロックアイテムが見つからない場合はfalse', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue(null);
    const result = await hasExceededTimeLimit('youtube.com');
    expect(result).toBe(false);
  });

  it('タイムリミットなしの場合はtrue（常時ブロック）', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue({
      id: 'b1',
      domain: 'youtube.com',
      isWildcard: false,
      createdAt: '2024-01-01T00:00:00Z',
      enabled: true
    });
    const result = await hasExceededTimeLimit('youtube.com');
    expect(result).toBe(true);
  });

  it('タイムリミットありで超過の場合はtrue', async () => {
    const blockItem = {
      id: 'b1',
      domain: 'youtube.com',
      isWildcard: false,
      createdAt: '2024-01-01T00:00:00Z',
      enabled: true,
      timeLimit: { type: 'daily' as const, limitSeconds: 3600 }
    };
    mockGetAnalytics.mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 4000,
          hourlyUsedSeconds: 0,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    });
    const result = await hasExceededTimeLimit('youtube.com', blockItem);
    expect(result).toBe(true);
  });
});

describe('getRemainingTime', () => {
  it('ブロックアイテムがない場合はnull', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue(null);
    const result = await getRemainingTime('youtube.com');
    expect(result).toBeNull();
  });

  it('タイムリミットなしの場合はnull', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue({
      id: 'b1',
      domain: 'youtube.com',
      isWildcard: false,
      createdAt: '2024-01-01T00:00:00Z',
      enabled: true
    });
    const result = await getRemainingTime('youtube.com');
    expect(result).toBeNull();
  });

  it('残り時間を返す', async () => {
    const blockItem = {
      id: 'b1',
      domain: 'youtube.com',
      isWildcard: false,
      createdAt: '2024-01-01T00:00:00Z',
      enabled: true,
      timeLimit: { type: 'daily' as const, limitSeconds: 3600 }
    };
    mockGetAnalytics.mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 1000,
          hourlyUsedSeconds: 0,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    });
    const result = await getRemainingTime('youtube.com', blockItem);
    expect(result).toBe(2600);
  });
});

describe('recordTimeLimitUsage', () => {
  it('0以下の秒数では何もしない', async () => {
    await recordTimeLimitUsage('youtube.com', 0);
    expect(mockGetAnalytics).not.toHaveBeenCalled();
  });

  it('ブロックアイテムが見つからない場合は何もしない', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue(null);
    await recordTimeLimitUsage('youtube.com', 60);
    expect(mockSetAnalytics).not.toHaveBeenCalled();
  });

  it('タイムリミットなしのアイテムの場合は何もしない', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue({
      id: 'b1',
      domain: 'youtube.com',
      isWildcard: false,
      createdAt: '2024-01-01T00:00:00Z',
      enabled: true
    });
    await recordTimeLimitUsage('youtube.com', 60);
    expect(mockSetAnalytics).not.toHaveBeenCalled();
  });

  it('使用量を記録する', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue({
      id: 'b1',
      domain: 'youtube.com',
      isWildcard: false,
      createdAt: '2024-01-01T00:00:00Z',
      enabled: true,
      timeLimit: { type: 'daily', limitSeconds: 3600 }
    });
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    mockSetAnalytics.mockResolvedValue(undefined);

    await recordTimeLimitUsage('youtube.com', 60);
    expect(mockSetAnalytics).toHaveBeenCalledTimes(1);
    const savedAnalytics = mockSetAnalytics.mock.calls[0][0];
    expect(savedAnalytics.timeLimitUsage['youtube.com'].dailyUsedSeconds).toBe(
      60
    );
    expect(savedAnalytics.timeLimitUsage['youtube.com'].hourlyUsedSeconds).toBe(
      60
    );
  });
});

describe('resetExpiredUsage', () => {
  it('リセットが不要な場合は保存しない', async () => {
    mockGetAnalytics.mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 100,
          hourlyUsedSeconds: 50,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    });
    await resetExpiredUsage();
    expect(mockSetAnalytics).not.toHaveBeenCalled();
  });

  it('日次リセットが必要な場合に実行する', async () => {
    mockNeedsDailyReset.mockReturnValue(true);
    mockGetAnalytics.mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 100,
          hourlyUsedSeconds: 50,
          lastDailyReset: '2024-06-11',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    });
    mockSetAnalytics.mockResolvedValue(undefined);

    await resetExpiredUsage();
    expect(mockSetAnalytics).toHaveBeenCalledTimes(1);
    const saved = mockSetAnalytics.mock.calls[0][0];
    expect(saved.timeLimitUsage['youtube.com'].dailyUsedSeconds).toBe(0);
  });
});

describe('getTimeLimitInfo', () => {
  it('無効なURLではnullを返す', async () => {
    const result = await getTimeLimitInfo('');
    expect(result).toBeNull();
  });

  it('ブロックアイテムがない場合はnull', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue(null);
    const result = await getTimeLimitInfo('https://google.com');
    expect(result).toBeNull();
  });

  it('タイムリミットなしの場合はisExceeded=true', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue({
      id: 'b1',
      domain: 'youtube.com',
      isWildcard: false,
      createdAt: '2024-01-01T00:00:00Z',
      enabled: true
    });
    const result = await getTimeLimitInfo('https://youtube.com');
    expect(result).not.toBeNull();
    expect(result!.hasTimeLimit).toBe(false);
    expect(result!.isExceeded).toBe(true);
  });

  it('タイムリミットありで残り時間を返す', async () => {
    mockFindEnabledBlockItemForDomain.mockResolvedValue({
      id: 'b1',
      domain: 'youtube.com',
      isWildcard: false,
      createdAt: '2024-01-01T00:00:00Z',
      enabled: true,
      timeLimit: { type: 'daily', limitSeconds: 3600 }
    });
    mockGetAnalytics.mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        'youtube.com': {
          domain: 'youtube.com',
          dailyUsedSeconds: 1000,
          hourlyUsedSeconds: 0,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    });

    const result = await getTimeLimitInfo('https://youtube.com');
    expect(result).not.toBeNull();
    expect(result!.hasTimeLimit).toBe(true);
    expect(result!.remainingSeconds).toBe(2600);
    expect(result!.limitType).toBe('daily');
    expect(result!.limitSeconds).toBe(3600);
    expect(result!.usedSeconds).toBe(1000);
    expect(result!.isExceeded).toBe(false);
  });
});
