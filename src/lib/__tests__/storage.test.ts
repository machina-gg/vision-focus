import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * chrome.storage のモック
 *
 * @wxt-dev/storage は読み込み時に `globalThis.chrome` を掴むため、モジュールの
 * import より前に用意する必要がある（vi.hoisted はモジュール評価より先に走る）。
 * local 領域は実際に値を保持する簡易実装にして、保存形式（キーと値）まで検証する。
 */
const fakeChrome = vi.hoisted(() => {
  const localData: Record<string, unknown> = {};

  const localArea = {
    get: async (keys?: string | string[]) => {
      if (typeof keys === 'string') return { [keys]: localData[keys] };
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, localData[key]]));
      }
      return { ...localData };
    },
    set: async (items: Record<string, unknown>) => {
      Object.assign(localData, items);
    },
    remove: async (key: string) => {
      delete localData[key];
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  };

  const session = {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn()
  };

  // chrome オブジェクト自体は差し替えない（差し替えると @wxt-dev/storage が
  // 掴んだ参照と食い違う）。テストごとに中身だけ初期化する
  (globalThis as Record<string, unknown>).chrome = {
    runtime: { id: 'test-extension' },
    storage: { local: localArea, session }
  };

  return {
    localData,
    session,
    reset: () => {
      for (const key of Object.keys(localData)) delete localData[key];
    }
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

beforeEach(() => {
  vi.clearAllMocks();
  fakeChrome.reset();
});

describe('保存形式', () => {
  it('chrome.storage.local に生のオブジェクトを保存する（キーに local: は付かない）', async () => {
    const settings = { ...DEFAULT_SETTINGS, paused: true };
    await setSettings(settings);

    expect(fakeChrome.localData).toEqual({ settings });
    expect(fakeChrome.localData['local:settings']).toBeUndefined();
  });
});

describe('getSettings', () => {
  it('データがある場合はそれを返す', async () => {
    fakeChrome.localData.settings = { ...DEFAULT_SETTINGS, paused: true };
    const result = await getSettings();
    expect(result.paused).toBe(true);
  });

  it('データがない場合はデフォルトを返す', async () => {
    const result = await getSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });
});

describe('setSettings', () => {
  it('設定をストレージに保存する', async () => {
    await setSettings(DEFAULT_SETTINGS);
    expect(fakeChrome.localData.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('updateSettings', () => {
  it('部分的に設定を更新する', async () => {
    fakeChrome.localData.settings = DEFAULT_SETTINGS;
    const result = await updateSettings({ paused: true });

    expect(result.paused).toBe(true);
    expect(fakeChrome.localData.settings).toEqual({
      ...DEFAULT_SETTINGS,
      paused: true
    });
  });
});

describe('getVision', () => {
  it('データがある場合はそれを返す', async () => {
    fakeChrome.localData.vision = { ...DEFAULT_VISION, activePresetId: 'test' };
    const result = await getVision();
    expect(result.activePresetId).toBe('test');
  });

  it('データがない場合はデフォルトを返す', async () => {
    const result = await getVision();
    expect(result).toEqual(DEFAULT_VISION);
  });
});

describe('setVision', () => {
  it('ビジョン設定を保存する', async () => {
    await setVision(DEFAULT_VISION);
    expect(fakeChrome.localData.vision).toEqual(DEFAULT_VISION);
  });
});

describe('getAnalytics', () => {
  it('データがある場合はそれを返す', async () => {
    fakeChrome.localData.analytics = {
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
    const result = await getAnalytics();
    expect(result.dailyStats['2024-06-12'].wasteTime).toBe(100);
  });

  it('データがない場合はデフォルトを返す', async () => {
    const result = await getAnalytics();
    expect(result).toEqual(DEFAULT_ANALYTICS);
  });
});

describe('setAnalytics', () => {
  it('アナリティクスデータを保存する', async () => {
    await setAnalytics(DEFAULT_ANALYTICS);
    expect(fakeChrome.localData.analytics).toEqual(DEFAULT_ANALYTICS);
  });
});

describe('getUnblockHistory', () => {
  it('データがない場合はデフォルトを返す', async () => {
    const result = await getUnblockHistory();
    expect(result).toEqual(DEFAULT_UNBLOCK_HISTORY);
  });
});

describe('setUnblockHistory', () => {
  it('アンブロック履歴を保存する', async () => {
    await setUnblockHistory(DEFAULT_UNBLOCK_HISTORY);
    expect(fakeChrome.localData.unblockHistory).toEqual(
      DEFAULT_UNBLOCK_HISTORY
    );
  });
});

describe('getAllStorage', () => {
  it('全ストレージデータを返す', async () => {
    const result = await getAllStorage();
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.vision).toEqual(DEFAULT_VISION);
    expect(result.analytics).toEqual(DEFAULT_ANALYTICS);
    expect(result.unblockHistory).toEqual(DEFAULT_UNBLOCK_HISTORY);
  });
});

describe('clearAllStorage', () => {
  it('全ストレージキーを削除する', async () => {
    fakeChrome.localData.settings = DEFAULT_SETTINGS;
    fakeChrome.localData.vision = DEFAULT_VISION;
    fakeChrome.localData.analytics = DEFAULT_ANALYTICS;
    fakeChrome.localData.unblockHistory = DEFAULT_UNBLOCK_HISTORY;

    await clearAllStorage();

    expect(fakeChrome.localData).toEqual({});
  });
});

describe('incrementSiteBlockCount', () => {
  it('新規ドメインのカウントを1にする', async () => {
    await incrementSiteBlockCount('youtube.com');
    expect(await getSiteBlockCount('youtube.com')).toBe(1);
  });

  it('既存ドメインのカウントをインクリメントする', async () => {
    fakeChrome.localData.analytics = {
      ...DEFAULT_ANALYTICS,
      siteBlockCounts: {
        'youtube.com': {
          domain: 'youtube.com',
          count: 5,
          lastBlocked: '2024-06-12T00:00:00Z'
        }
      }
    };

    await incrementSiteBlockCount('youtube.com');

    expect(await getSiteBlockCount('youtube.com')).toBe(6);
  });
});

describe('getSiteBlockCount', () => {
  it('存在しないドメインは0を返す', async () => {
    fakeChrome.localData.analytics = DEFAULT_ANALYTICS;
    expect(await getSiteBlockCount('youtube.com')).toBe(0);
  });
});

describe('getAllSiteBlockCounts', () => {
  it('カウント降順でソートして返す', async () => {
    fakeChrome.localData.analytics = {
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
    };

    const counts = await getAllSiteBlockCounts();

    expect(counts[0].domain).toBe('twitter.com');
    expect(counts[1].domain).toBe('youtube.com');
  });
});

describe('storage（キー指定の互換オブジェクト）', () => {
  it('未保存のキーは undefined を返す', async () => {
    expect(await storage.get('vision')).toBeUndefined();
  });

  it('生のオブジェクトで保存し、同じ値を読み出せる', async () => {
    await storage.set('vision', DEFAULT_VISION);

    expect(fakeChrome.localData.vision).toEqual(DEFAULT_VISION);
    expect(await storage.get('vision')).toEqual(DEFAULT_VISION);
  });

  it('remove で削除できる', async () => {
    await storage.set('vision', DEFAULT_VISION);
    await storage.remove('vision');

    expect(await storage.get('vision')).toBeUndefined();
  });
});

describe('setLastBlockedDomain', () => {
  it('セッションストレージにドメインを保存する', async () => {
    fakeChrome.session.set.mockResolvedValue(undefined);
    await setLastBlockedDomain('youtube.com');
    expect(fakeChrome.session.set).toHaveBeenCalledWith({
      lastBlockedDomain: 'youtube.com'
    });
  });
});

describe('getLastBlockedDomain', () => {
  it('保存されたドメインを返す', async () => {
    fakeChrome.session.get.mockResolvedValue({
      lastBlockedDomain: 'youtube.com'
    });
    const result = await getLastBlockedDomain();
    expect(result).toBe('youtube.com');
  });

  it('保存されていない場合はnullを返す', async () => {
    fakeChrome.session.get.mockResolvedValue({});
    const result = await getLastBlockedDomain();
    expect(result).toBeNull();
  });
});

describe('clearLastBlockedDomain', () => {
  it('セッションストレージからドメインを削除する', async () => {
    fakeChrome.session.remove.mockResolvedValue(undefined);
    await clearLastBlockedDomain();
    expect(fakeChrome.session.remove).toHaveBeenCalledWith('lastBlockedDomain');
  });
});
