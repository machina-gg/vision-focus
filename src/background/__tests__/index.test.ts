import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * background のエントリポイントは import 時に副作用として初期化を行うため、
 * hoisted な共有スパイを使い、動的 import で読み込んで検証する。
 */
const mocks = vi.hoisted(() => ({
  startExtPayBackgroundListener: vi.fn(),
  setupSettingsWatcher: vi.fn(),
  setupLifecycleHandlers: vi.fn(),
  setupAlarmHandlers: vi.fn(),
  setupNavigationTracking: vi.fn(),
  createAlarms: vi.fn()
}));

vi.mock('~/lib/extpay', () => ({
  startExtPayBackgroundListener: mocks.startExtPayBackgroundListener
}));

vi.mock('../listeners/settingsWatcher', () => ({
  setupSettingsWatcher: mocks.setupSettingsWatcher
}));

vi.mock('../listeners/lifecycleHandlers', () => ({
  setupLifecycleHandlers: mocks.setupLifecycleHandlers
}));

vi.mock('../listeners/alarmHandlers', () => ({
  setupAlarmHandlers: mocks.setupAlarmHandlers,
  createAlarms: mocks.createAlarms
}));

vi.mock('../listeners/navigationTracking', () => ({
  setupNavigationTracking: mocks.setupNavigationTracking
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('background エントリポイント', () => {
  it('全てのリスナー登録と初期化を行う', async () => {
    vi.resetModules();

    await import('../index');

    // ExtensionPay は Manifest V3 の制約でトップレベル初期化が必須
    expect(mocks.startExtPayBackgroundListener).toHaveBeenCalledOnce();
    expect(mocks.setupSettingsWatcher).toHaveBeenCalledOnce();
    expect(mocks.setupLifecycleHandlers).toHaveBeenCalledOnce();
    expect(mocks.setupAlarmHandlers).toHaveBeenCalledOnce();
    expect(mocks.setupNavigationTracking).toHaveBeenCalledOnce();
    expect(mocks.createAlarms).toHaveBeenCalledOnce();
  });
});
