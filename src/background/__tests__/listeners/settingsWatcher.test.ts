import { describe, expect, it, vi, beforeEach } from 'vitest';

type WatchCallback = (change: {
  newValue: unknown;
  oldValue?: unknown;
}) => Promise<void>;

/**
 * resetModules でモジュールを読み直すとモック関数の実体も作り直されるため、
 * hoisted な共有スパイを使って呼び出し記録の同一性を保つ。
 */
const mocks = vi.hoisted(() => ({
  watch: vi.fn(),
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  storage: { watch: mocks.watch }
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: mocks.updateBlockRules,
  blockExistingTabs: mocks.blockExistingTabs
}));

import { DEFAULT_SETTINGS, DEFAULT_YOUTUBE_SETTINGS } from '~/types/storage';
import type { AppSettings } from '~/types/storage';

/**
 * watcher はモジュールレベルに previousSettings を保持するため、
 * テストごとに resetModules して読み込み直す（状態がテスト間で漏れるのを防ぐ）。
 */
async function load() {
  vi.resetModules();
  const { setupSettingsWatcher } =
    await import('../../listeners/settingsWatcher');

  setupSettingsWatcher();

  const config = mocks.watch.mock.calls[0][0] as Record<string, WatchCallback>;

  return {
    watch: mocks.watch,
    watcher: config.settings,
    updateBlockRules: mocks.updateBlockRules,
    blockExistingTabs: mocks.blockExistingTabs
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

/**
 * watcher は初回の変更で previousSettings を確立するため、
 * 「前回状態あり」の検証には 2 回流す必要がある。
 */
async function applyChanges(watcher: WatchCallback, values: AppSettings[]) {
  for (const value of values) {
    await watcher({ newValue: value });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('setupSettingsWatcher', () => {
  it('settings の変更を監視する', async () => {
    const { watch } = await load();

    expect(watch).toHaveBeenCalledWith(
      expect.objectContaining({ settings: expect.any(Function) })
    );
  });

  it('変更時にブロックルールを更新する', async () => {
    const { watcher, updateBlockRules } = await load();

    await watcher({ newValue: settings() });

    expect(updateBlockRules).toHaveBeenCalled();
  });

  it('newValue が無い場合は何もしない', async () => {
    const { watcher, updateBlockRules, blockExistingTabs } = await load();

    await watcher({ newValue: undefined });

    expect(updateBlockRules).not.toHaveBeenCalled();
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  describe('既存タブをブロックする条件', () => {
    it('一時停止が解除されたとき', async () => {
      const { watcher, blockExistingTabs } = await load();

      await applyChanges(watcher, [
        settings({ paused: true }),
        settings({ paused: false })
      ]);

      expect(blockExistingTabs).toHaveBeenCalled();
    });

    it('ブロック項目が有効化されたとき', async () => {
      const { watcher, blockExistingTabs } = await load();

      await applyChanges(watcher, [
        settings({ blockList: [blockItem('a', false)] }),
        settings({ blockList: [blockItem('a', true)] })
      ]);

      expect(blockExistingTabs).toHaveBeenCalled();
    });

    it('ブロック項目が新規追加され有効な状態のとき', async () => {
      const { watcher, blockExistingTabs } = await load();

      await applyChanges(watcher, [
        settings({ blockList: [blockItem('a', true)] }),
        settings({ blockList: [blockItem('a', true), blockItem('b', true)] })
      ]);

      expect(blockExistingTabs).toHaveBeenCalled();
    });

    it('YouTube のアクセスブロックが有効化されたとき', async () => {
      const { watcher, blockExistingTabs } = await load();

      await applyChanges(watcher, [
        settings({
          youtube: {
            ...DEFAULT_YOUTUBE_SETTINGS,
            enabled: true,
            blockAccess: false
          }
        }),
        settings({
          youtube: {
            ...DEFAULT_YOUTUBE_SETTINGS,
            enabled: true,
            blockAccess: true
          }
        })
      ]);

      expect(blockExistingTabs).toHaveBeenCalled();
    });
  });

  describe('既存タブをブロックしない条件', () => {
    it('初回の変更（前回状態が無い）では既存タブに手を出さない', async () => {
      const { watcher, updateBlockRules, blockExistingTabs } = await load();

      await watcher({
        newValue: settings({ blockList: [blockItem('a', true)] })
      });

      expect(updateBlockRules).toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('ブロック項目が無効化されたとき', async () => {
      const { watcher, blockExistingTabs } = await load();

      await applyChanges(watcher, [
        settings({ blockList: [blockItem('a', true)] }),
        settings({ blockList: [blockItem('a', false)] })
      ]);

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('一時停止が有効化されたとき', async () => {
      const { watcher, blockExistingTabs } = await load();

      await applyChanges(watcher, [
        settings({ paused: false }),
        settings({ paused: true })
      ]);

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('ブロックに無関係な設定だけが変わったとき', async () => {
      const { watcher, updateBlockRules, blockExistingTabs } = await load();

      await applyChanges(watcher, [
        settings({ language: null }),
        settings({ language: 'ja' })
      ]);

      expect(updateBlockRules).toHaveBeenCalledTimes(2);
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('YouTube が有効でもアクセスブロックが無効なら対象外', async () => {
      const { watcher, blockExistingTabs } = await load();

      await applyChanges(watcher, [
        settings({
          youtube: { ...DEFAULT_YOUTUBE_SETTINGS, enabled: false }
        }),
        settings({
          youtube: {
            ...DEFAULT_YOUTUBE_SETTINGS,
            enabled: true,
            blockAccess: false
          }
        })
      ]);

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });
});
