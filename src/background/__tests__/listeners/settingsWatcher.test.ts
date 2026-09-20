import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AppSettings } from '~/types/storage';

type WatchCallback = (
  newValue: AppSettings | undefined,
  oldValue?: AppSettings
) => Promise<void>;

/**
 * resetModules でモジュールを読み直すとモック関数の実体も作り直されるため、
 * hoisted な共有スパイを使って呼び出し記録の同一性を保つ。
 */
const mocks = vi.hoisted(() => ({
  watch: vi.fn(),
  updateBlockRules: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  settingsItem: { watch: mocks.watch }
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: mocks.updateBlockRules
}));

import { DEFAULT_SETTINGS, DEFAULT_YOUTUBE_SETTINGS } from '~/types/storage';

async function load() {
  vi.resetModules();
  const { setupSettingsWatcher } =
    await import('../../listeners/settingsWatcher');

  setupSettingsWatcher();

  return {
    watch: mocks.watch,
    watcher: mocks.watch.mock.calls[0][0] as WatchCallback,
    updateBlockRules: mocks.updateBlockRules
  };
}

const blockItem = (id: string, enabled: boolean) => ({
  id,
  domain: `${id}.com`,
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled
});

const settings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('setupSettingsWatcher', () => {
  it('settings の変更を監視する', async () => {
    const { watch } = await load();

    expect(watch).toHaveBeenCalledWith(expect.any(Function));
  });

  it('変更時にブロックルールを更新する', async () => {
    const { watcher, updateBlockRules } = await load();

    await watcher(settings());

    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('newValue が無い場合は何もしない', async () => {
    const { watcher, updateBlockRules } = await load();

    await watcher(undefined);

    expect(updateBlockRules).not.toHaveBeenCalled();
  });

  it('変更のたびにブロックルールを更新する（前回状態を持たない）', async () => {
    const { watcher, updateBlockRules } = await load();

    await watcher(settings({ blockList: [blockItem('a', true)] }));
    await watcher(settings({ blockList: [blockItem('a', false)] }));

    expect(updateBlockRules).toHaveBeenCalledTimes(2);
  });

  it('ブロックを有効化する変更でも既存タブには手を出さない（各メッセージハンドラの担当）', async () => {
    // blocker のモックに blockExistingTabs を持たせていないため、
    // watcher がこれを呼べばここで参照エラーになる（#392）
    const { watcher, updateBlockRules } = await load();

    await watcher(
      settings({
        paused: false,
        blockList: [blockItem('a', true)],
        youtube: {
          ...DEFAULT_YOUTUBE_SETTINGS,
          enabled: true,
          blockAccess: true
        }
      })
    );

    expect(updateBlockRules).toHaveBeenCalledOnce();
  });
});
