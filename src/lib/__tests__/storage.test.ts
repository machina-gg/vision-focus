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
  getSites,
  getAllStorage,
  clearAllStorage,
  setLastBlockedDomain,
  getLastBlockedDomain,
  clearLastBlockedDomain,
  hasStoredVision,
  visionItem,
  supportPromptItem
} from '~/lib/storage';
import {
  DEFAULT_ACTIVITY,
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  DEFAULT_SITES,
  DEFAULT_SUPPORT_PROMPT_STATE
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

  it('旧形式（JSON 文字列）が残っていても初期値を返す', async () => {
    // 実キーは変わらないため、旧実装が書いた JSON 文字列が同じキーに残りうる。
    // そのまま返すと settings.schedules などの参照が壊れる
    fakeChrome.localData.settings = JSON.stringify({
      ...DEFAULT_SETTINGS,
      paused: true
    });
    fakeChrome.localData.vision = JSON.stringify(DEFAULT_VISION);
    fakeChrome.localData.sites = JSON.stringify({});

    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(await getVision()).toEqual(DEFAULT_VISION);
    expect(await getSites()).toEqual(DEFAULT_SITES);
    // 未保存判定でも旧形式は「保存されていない」として扱う
    expect(await hasStoredVision()).toBe(false);
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

describe('getSites', () => {
  it('データがない場合は空（追跡中のサイトなし）を返す', async () => {
    expect(await getSites()).toEqual(DEFAULT_SITES);
  });

  it('保存済みのサイトを返す', async () => {
    const sites = {
      'x.com': {
        domain: 'x.com',
        trackedAt: '2024-01-01T00:00:00.000Z',
        block: null,
        youtube: null
      }
    };
    fakeChrome.localData.sites = sites;
    expect(await getSites()).toEqual(sites);
  });
});

describe('getAllStorage', () => {
  it('全ストレージデータを返す', async () => {
    const result = await getAllStorage();
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.vision).toEqual(DEFAULT_VISION);
    expect(result.sites).toEqual(DEFAULT_SITES);
    expect(result.activity).toEqual(DEFAULT_ACTIVITY);
  });
});

describe('clearAllStorage', () => {
  it('全ストレージキーを削除する', async () => {
    fakeChrome.localData.settings = DEFAULT_SETTINGS;
    fakeChrome.localData.vision = DEFAULT_VISION;
    fakeChrome.localData.sites = {};
    fakeChrome.localData.activity = {
      '2024-06-12': { 'youtube.com': { seconds: 60, blocks: 1, unblocks: 0 } }
    };

    await clearAllStorage();

    expect(fakeChrome.localData).toEqual({});
  });
});

describe('hasStoredVision', () => {
  it('未保存なら false を返す', async () => {
    expect(await hasStoredVision()).toBe(false);
  });

  it('保存済みなら true を返す', async () => {
    await setVision(DEFAULT_VISION);

    expect(await hasStoredVision()).toBe(true);
  });

  it('削除すると false に戻る', async () => {
    await setVision(DEFAULT_VISION);
    await visionItem.removeValue();

    expect(await hasStoredVision()).toBe(false);
  });
});

describe('supportPromptItem', () => {
  it('未保存なら既定値を返す（実キーに local: は付かない）', async () => {
    expect(await supportPromptItem.getValue()).toEqual(
      DEFAULT_SUPPORT_PROMPT_STATE
    );
    expect(fakeChrome.localData['local:supportPrompt']).toBeUndefined();
  });

  it('生のオブジェクトで保存し、同じ値を読み出せる', async () => {
    const state = { dismissedAt: 12_345, opened: true };
    await supportPromptItem.setValue(state);

    expect(fakeChrome.localData.supportPrompt).toEqual(state);
    expect(await supportPromptItem.getValue()).toEqual(state);
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
