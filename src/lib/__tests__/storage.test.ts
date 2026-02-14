import { describe, expect, it, vi, beforeEach } from 'vitest';

// @plasmohq/storage をモック
vi.mock('@plasmohq/storage', () => {
  const mockStorage = {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  };
  return {
    Storage: vi.fn(() => mockStorage)
  };
});

import {
  getSettings,
  setSettings,
  updateSettings,
  getVision,
  setVision,
  getAnalytics,
  setAnalytics,
  getUnblockHistory,
  setUnblockHistory,
  getAllStorage,
  clearAllStorage,
  incrementSiteBlockCount,
  getSiteBlockCount,
  getAllSiteBlockCounts,
  setLastBlockedDomain,
  getLastBlockedDomain,
  clearLastBlockedDomain,
  storage
} from '~/lib/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_ANALYTICS,
  DEFAULT_UNBLOCK_HISTORY
} from '~/types/storage';

// chrome.storage.session のモック
const mockSessionSet = vi.fn();
const mockSessionGet = vi.fn();
const mockSessionRemove = vi.fn();

// グローバルの chrome オブジェクトをモック
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).chrome = {
    storage: {
      session: {
        set: mockSessionSet,
        get: mockSessionGet,
        remove: mockSessionRemove
      }
    }
  };
});

describe('getSettings', () => {
  it('データがある場合はそれを返す', async () => {
    const mockData = { ...DEFAULT_SETTINGS, paused: true };
    vi.mocked(storage.get).mockResolvedValue(mockData);
    const result = await getSettings();
    expect(result.paused).toBe(true);
  });

  it('データがない場合はデフォルトを返す', async () => {
    vi.mocked(storage.get).mockResolvedValue(undefined);
    const result = await getSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });
});

describe('setSettings', () => {
  it('設定をストレージに保存する', async () => {
    vi.mocked(storage.set).mockResolvedValue(undefined);
    await setSettings(DEFAULT_SETTINGS);
    expect(storage.set).toHaveBeenCalledWith('settings', DEFAULT_SETTINGS);
  });
});

describe('updateSettings', () => {
  it('部分的に設定を更新する', async () => {
    vi.mocked(storage.get).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(storage.set).mockResolvedValue(undefined);
    const result = await updateSettings({ paused: true });
    expect(result.paused).toBe(true);
    expect(storage.set).toHaveBeenCalledTimes(1);
  });
});

describe('getVision', () => {
  it('データがある場合はそれを返す', async () => {
    const mockData = { ...DEFAULT_VISION, activePresetId: 'test' };
    vi.mocked(storage.get).mockResolvedValue(mockData);
    const result = await getVision();
    expect(result.activePresetId).toBe('test');
  });

  it('データがない場合はデフォルトを返す', async () => {
    vi.mocked(storage.get).mockResolvedValue(undefined);
    const result = await getVision();
    expect(result).toEqual(DEFAULT_VISION);
  });
});

describe('setVision', () => {
  it('ビジョン設定を保存する', async () => {
    vi.mocked(storage.set).mockResolvedValue(undefined);
    await setVision(DEFAULT_VISION);
    expect(storage.set).toHaveBeenCalledWith('vision', DEFAULT_VISION);
  });
});

describe('getAnalytics', () => {
  it('データがある場合はそれを返す', async () => {
    const mockData = {
      ...DEFAULT_ANALYTICS,
      dailyStats: {
        '2024-06-12': {
          date: '2024-06-12',
          wasteTime: 100,
          investTime: 0,
          blockCount: 5,
          unblockCount: 0
        }
      }
    };
    vi.mocked(storage.get).mockResolvedValue(mockData);
    const result = await getAnalytics();
    expect(result.dailyStats['2024-06-12'].wasteTime).toBe(100);
  });

  it('データがない場合はデフォルトを返す', async () => {
    vi.mocked(storage.get).mockResolvedValue(undefined);
    const result = await getAnalytics();
    expect(result).toEqual(DEFAULT_ANALYTICS);
  });
});

describe('setAnalytics', () => {
  it('アナリティクスデータを保存する', async () => {
    vi.mocked(storage.set).mockResolvedValue(undefined);
    await setAnalytics(DEFAULT_ANALYTICS);
    expect(storage.set).toHaveBeenCalledWith('analytics', DEFAULT_ANALYTICS);
  });
});

describe('getUnblockHistory', () => {
  it('データがない場合はデフォルトを返す', async () => {
    vi.mocked(storage.get).mockResolvedValue(undefined);
    const result = await getUnblockHistory();
    expect(result).toEqual(DEFAULT_UNBLOCK_HISTORY);
  });
});

describe('setUnblockHistory', () => {
  it('アンブロック履歴を保存する', async () => {
    vi.mocked(storage.set).mockResolvedValue(undefined);
    await setUnblockHistory(DEFAULT_UNBLOCK_HISTORY);
    expect(storage.set).toHaveBeenCalledWith(
      'unblockHistory',
      DEFAULT_UNBLOCK_HISTORY
    );
  });
});

describe('getAllStorage', () => {
  it('全ストレージデータを返す', async () => {
    vi.mocked(storage.get)
      .mockResolvedValueOnce(DEFAULT_SETTINGS)
      .mockResolvedValueOnce(DEFAULT_VISION)
      .mockResolvedValueOnce(DEFAULT_ANALYTICS)
      .mockResolvedValueOnce(DEFAULT_UNBLOCK_HISTORY);
    const result = await getAllStorage();
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.vision).toEqual(DEFAULT_VISION);
    expect(result.analytics).toEqual(DEFAULT_ANALYTICS);
    expect(result.unblockHistory).toEqual(DEFAULT_UNBLOCK_HISTORY);
  });
});

describe('clearAllStorage', () => {
  it('全ストレージキーを削除する', async () => {
    vi.mocked(storage.remove).mockResolvedValue(undefined);
    await clearAllStorage();
    expect(storage.remove).toHaveBeenCalledTimes(4);
  });
});

describe('incrementSiteBlockCount', () => {
  it('新規ドメインのカウントを1にする', async () => {
    vi.mocked(storage.get).mockResolvedValue(DEFAULT_ANALYTICS);
    vi.mocked(storage.set).mockResolvedValue(undefined);
    await incrementSiteBlockCount('youtube.com');
    const savedData = vi.mocked(storage.set).mock.calls[0][1];
    expect(
      (
        savedData as Record<string, unknown> & {
          siteBlockCounts: Record<string, { count: number }>;
        }
      ).siteBlockCounts['youtube.com'].count
    ).toBe(1);
  });

  it('既存ドメインのカウントをインクリメントする', async () => {
    vi.mocked(storage.get).mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      siteBlockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 5,
          lastBlocked: '2024-06-12T00:00:00Z'
        }
      }
    });
    vi.mocked(storage.set).mockResolvedValue(undefined);
    await incrementSiteBlockCount('youtube.com');
    const savedData = vi.mocked(storage.set).mock.calls[0][1];
    expect(
      (
        savedData as Record<string, unknown> & {
          siteBlockCounts: Record<string, { count: number }>;
        }
      ).siteBlockCounts['youtube.com'].count
    ).toBe(6);
  });
});

describe('getSiteBlockCount', () => {
  it('存在するドメインのカウントを返す', async () => {
    vi.mocked(storage.get).mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      siteBlockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 10,
          lastBlocked: '2024-06-12T00:00:00Z'
        }
      }
    });
    const count = await getSiteBlockCount('youtube.com');
    expect(count).toBe(10);
  });

  it('存在しないドメインは0を返す', async () => {
    vi.mocked(storage.get).mockResolvedValue(DEFAULT_ANALYTICS);
    const count = await getSiteBlockCount('youtube.com');
    expect(count).toBe(0);
  });
});

describe('getAllSiteBlockCounts', () => {
  it('カウント降順でソートして返す', async () => {
    vi.mocked(storage.get).mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      siteBlockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 5,
          lastBlocked: '2024-06-12T00:00:00Z'
        },
        'twitter.com': {
          domain: 'twitter.com',
          count: 10,
          lastBlocked: '2024-06-12T00:00:00Z'
        }
      }
    });
    const counts = await getAllSiteBlockCounts();
    expect(counts[0].domain).toBe('twitter.com');
    expect(counts[1].domain).toBe('youtube.com');
  });
});

describe('setLastBlockedDomain', () => {
  it('セッションストレージにドメインを保存する', async () => {
    mockSessionSet.mockResolvedValue(undefined);
    await setLastBlockedDomain('youtube.com');
    expect(mockSessionSet).toHaveBeenCalledWith({
      lastBlockedDomain: 'youtube.com'
    });
  });
});

describe('getLastBlockedDomain', () => {
  it('保存されたドメインを返す', async () => {
    mockSessionGet.mockResolvedValue({ lastBlockedDomain: 'youtube.com' });
    const result = await getLastBlockedDomain();
    expect(result).toBe('youtube.com');
  });

  it('保存されていない場合はnullを返す', async () => {
    mockSessionGet.mockResolvedValue({});
    const result = await getLastBlockedDomain();
    expect(result).toBeNull();
  });
});

describe('clearLastBlockedDomain', () => {
  it('セッションストレージからドメインを削除する', async () => {
    mockSessionRemove.mockResolvedValue(undefined);
    await clearLastBlockedDomain();
    expect(mockSessionRemove).toHaveBeenCalledWith('lastBlockedDomain');
  });
});
