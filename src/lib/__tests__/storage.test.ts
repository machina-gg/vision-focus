import { describe, expect, it, vi, beforeEach } from 'vitest';

// @wxt-dev/storage は読み込み時に globalThis.chrome を掴むため、import より前に用意する
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

  // chrome オブジェクト自体を差し替えると @wxt-dev/storage が掴んだ参照と食い違うため、中身だけ初期化する
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
  backgroundImageKey,
  getBackgroundImage,
  getBackgroundImages,
  getSettings,
  getVision,
  getSites,
  getAllStorage,
  setLastBlocked,
  getLastBlocked,
  clearLastBlocked,
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
    const vision = { ...DEFAULT_VISION, activePresetId: 'test' };
    await visionItem.setValue(vision);

    expect(fakeChrome.localData).toEqual({ vision });
    expect(fakeChrome.localData['local:vision']).toBeUndefined();
  });

  it('旧形式（JSON 文字列）が残っていても初期値を返す', async () => {
    // 実キーが同じため古い JSON 文字列が残りうる。そのまま返すと settings.schedules などの参照が壊れる
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

describe('背景画像', () => {
  const JPEG = 'data:image/jpeg;base64,/9j/AAAA';

  it('画像 1 枚ごとに backgroundImage:<ID> の実キーで読む', async () => {
    fakeChrome.localData['backgroundImage:img-1'] = JPEG;

    expect(backgroundImageKey('img-1')).toBe('local:backgroundImage:img-1');
    expect(await getBackgroundImage('img-1')).toBe(JPEG);
  });

  it('画像の無い ID・文字列でない値は null（画像なし）にする', async () => {
    fakeChrome.localData['backgroundImage:broken'] = { data: JPEG };

    expect(await getBackgroundImage('missing')).toBeNull();
    expect(await getBackgroundImage('broken')).toBeNull();
  });

  it('まとめて読むと、画像のある ID だけを返す', async () => {
    fakeChrome.localData['backgroundImage:img-1'] = JPEG;

    expect(await getBackgroundImages(['img-1', 'missing'])).toEqual({
      'img-1': JPEG
    });
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

describe('getSites', () => {
  it('データがない場合は空（追跡中のサイトなし）を返す', async () => {
    expect(await getSites()).toEqual(DEFAULT_SITES);
  });

  it('保存済みのサイトを返す', async () => {
    const sites = {
      'x.com': {
        domain: 'x.com',
        trackedAt: '2024-01-01T00:00:00.000Z',
        rule: null,
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

describe('hasStoredVision', () => {
  it('未保存なら false を返す', async () => {
    expect(await hasStoredVision()).toBe(false);
  });

  it('保存済みなら true を返す', async () => {
    await visionItem.setValue(DEFAULT_VISION);

    expect(await hasStoredVision()).toBe(true);
  });

  it('削除すると false に戻る', async () => {
    await visionItem.setValue(DEFAULT_VISION);
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

describe('setLastBlocked', () => {
  it('セッションストレージにドメインと理由を 1 つの組で保存する', async () => {
    fakeChrome.session.set.mockResolvedValue(undefined);
    await setLastBlocked({
      domain: 'youtube.com',
      reason: 'time_limit_exceeded'
    });
    expect(fakeChrome.session.set).toHaveBeenCalledWith({
      lastBlocked: { domain: 'youtube.com', reason: 'time_limit_exceeded' }
    });
  });
});

describe('getLastBlocked', () => {
  it('保存されたドメインと理由を返す', async () => {
    fakeChrome.session.get.mockResolvedValue({
      lastBlocked: { domain: 'youtube.com', reason: 'always_blocked' }
    });
    const result = await getLastBlocked();
    expect(result).toEqual({ domain: 'youtube.com', reason: 'always_blocked' });
  });

  it('保存されていない場合はnullを返す', async () => {
    fakeChrome.session.get.mockResolvedValue({});
    const result = await getLastBlocked();
    expect(result).toBeNull();
  });
});

describe('clearLastBlocked', () => {
  it('セッションストレージから記録を削除する', async () => {
    fakeChrome.session.remove.mockResolvedValue(undefined);
    await clearLastBlocked();
    expect(fakeChrome.session.remove).toHaveBeenCalledWith('lastBlocked');
  });
});
