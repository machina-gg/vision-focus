import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AppSettings } from '~/types/storage';
import type { TrackedSites } from '~/types/site';
import { blockedSite, sitesOf } from '~/test/sites';

type WatchCallback<T> = (
  newValue: T | undefined,
  oldValue?: T
) => Promise<void>;

/**
 * resetModules でモジュールを読み直すとモック関数の実体も作り直されるため、
 * hoisted な共有スパイを使って呼び出し記録の同一性を保つ。
 */
const mocks = vi.hoisted(() => ({
  watchSettings: vi.fn(),
  watchSites: vi.fn(),
  updateBlockRules: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  settingsItem: { watch: mocks.watchSettings },
  sitesItem: { watch: mocks.watchSites }
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: mocks.updateBlockRules
}));

import { DEFAULT_SETTINGS } from '~/types/storage';

async function load() {
  vi.resetModules();
  const { setupSettingsWatcher } =
    await import('../../listeners/settingsWatcher');

  setupSettingsWatcher();

  return {
    settingsWatcher: mocks.watchSettings.mock
      .calls[0][0] as WatchCallback<AppSettings>,
    sitesWatcher: mocks.watchSites.mock
      .calls[0][0] as WatchCallback<TrackedSites>,
    updateBlockRules: mocks.updateBlockRules
  };
}

const settings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('setupSettingsWatcher', () => {
  it('全体の設定と追跡中のサイトの変更を監視する', async () => {
    await load();

    expect(mocks.watchSettings).toHaveBeenCalledWith(expect.any(Function));
    expect(mocks.watchSites).toHaveBeenCalledWith(expect.any(Function));
  });

  it('settings の変更時にブロックルールを更新する', async () => {
    const { settingsWatcher, updateBlockRules } = await load();

    await settingsWatcher(settings({ paused: true }));

    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('sites の変更時にブロックルールを更新する', async () => {
    const { sitesWatcher, updateBlockRules } = await load();

    await sitesWatcher(sitesOf(blockedSite('a.com')));

    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('newValue が無い場合は何もしない', async () => {
    const { settingsWatcher, sitesWatcher, updateBlockRules } = await load();

    await settingsWatcher(undefined);
    await sitesWatcher(undefined);

    expect(updateBlockRules).not.toHaveBeenCalled();
  });

  it('変更のたびにブロックルールを更新する（前回状態を持たない）', async () => {
    const { sitesWatcher, updateBlockRules } = await load();

    await sitesWatcher(sitesOf(blockedSite('a.com')));
    await sitesWatcher(sitesOf(blockedSite('a.com', { enabled: false })));

    expect(updateBlockRules).toHaveBeenCalledTimes(2);
  });

  it('ブロックを有効化する変更でも既存タブには手を出さない（各メッセージハンドラの担当）', async () => {
    // blocker のモックに blockExistingTabs を持たせていないため、
    // watcher がこれを呼べばここで参照エラーになる
    const { settingsWatcher, sitesWatcher, updateBlockRules } = await load();

    await settingsWatcher(settings({ paused: false }));
    await sitesWatcher(
      sitesOf(blockedSite('a.com'), blockedSite('youtube.com'))
    );

    expect(updateBlockRules).toHaveBeenCalledTimes(2);
  });
});
