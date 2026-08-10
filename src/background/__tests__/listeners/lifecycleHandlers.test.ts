import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

vi.mock('../../tracker', () => ({
  startTracking: vi.fn()
}));

import { updateBlockRules } from '../../blocker';
import { startTracking } from '../../tracker';
import { setupLifecycleHandlers } from '../../listeners/lifecycleHandlers';

/** ライフサイクルイベントを発火できる chrome モックを構築する */
function setupChrome() {
  const handlers: Record<string, (() => Promise<void>) | null> = {
    installed: null,
    startup: null
  };

  (globalThis as Record<string, unknown>).chrome = {
    runtime: {
      id: 'test-extension-id',
      onInstalled: {
        addListener: vi.fn((fn) => {
          handlers.installed = fn;
        })
      },
      onStartup: {
        addListener: vi.fn((fn) => {
          handlers.startup = fn;
        })
      }
    }
  };

  return {
    fireInstalled: async () => {
      if (!handlers.installed) throw new Error('onInstalled が未登録');
      await handlers.installed();
    },
    fireStartup: async () => {
      if (!handlers.startup) throw new Error('onStartup が未登録');
      await handlers.startup();
    }
  };
}

let harness: ReturnType<typeof setupChrome>;

beforeEach(() => {
  vi.clearAllMocks();
  harness = setupChrome();
});

describe('setupLifecycleHandlers', () => {
  it('インストール時と起動時の両方を購読する', () => {
    setupLifecycleHandlers();

    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    expect(chrome.runtime.onStartup.addListener).toHaveBeenCalled();
  });

  it('インストール時にブロックルールを初期化し計測を開始する', async () => {
    setupLifecycleHandlers();

    await harness.fireInstalled();

    expect(updateBlockRules).toHaveBeenCalledOnce();
    expect(startTracking).toHaveBeenCalledOnce();
  });

  it('ブラウザ起動時にもブロックルールを更新し計測を開始する', async () => {
    setupLifecycleHandlers();

    await harness.fireStartup();

    expect(updateBlockRules).toHaveBeenCalledOnce();
    expect(startTracking).toHaveBeenCalledOnce();
  });

  it('購読するだけでは何も実行しない', () => {
    setupLifecycleHandlers();

    expect(updateBlockRules).not.toHaveBeenCalled();
    expect(startTracking).not.toHaveBeenCalled();
  });
});
