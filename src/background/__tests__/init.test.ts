import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * initBackground は各リスナーの登録関数を呼ぶだけなので、
 * 依存をすべてモックして「1 回ずつ呼ばれること」を検証する。
 */
const mocks = vi.hoisted(() => ({
  setupSettingsWatcher: vi.fn(),
  setupLifecycleHandlers: vi.fn(),
  setupAlarmHandlers: vi.fn(),
  setupNavigationTracking: vi.fn(),
  createAlarms: vi.fn(),
  registerMessageHandlers: vi.fn(),
  startTracking: vi.fn()
}));

vi.mock('../handlers', () => ({
  registerMessageHandlers: mocks.registerMessageHandlers
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

vi.mock('../tracker', () => ({
  startTracking: mocks.startTracking
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('initBackground', () => {
  it('全てのリスナー登録と初期化を行う', async () => {
    const { initBackground } = await import('../init');

    initBackground();

    expect(mocks.setupSettingsWatcher).toHaveBeenCalledOnce();
    expect(mocks.setupLifecycleHandlers).toHaveBeenCalledOnce();
    expect(mocks.setupAlarmHandlers).toHaveBeenCalledOnce();
    expect(mocks.setupNavigationTracking).toHaveBeenCalledOnce();
    expect(mocks.registerMessageHandlers).toHaveBeenCalledOnce();
    expect(mocks.createAlarms).toHaveBeenCalledOnce();
  });

  it('滞在時間の計測を開始する', async () => {
    // ⚠ エントリは service worker の起動のたびに評価される。ここで開始しないと、
    // onInstalled / onStartup でしか始まらず、最初のアイドル停止以降は
    // ブラウザを再起動するまで計測が動かない（#440）
    const { initBackground } = await import('../init');

    initBackground();

    expect(mocks.startTracking).toHaveBeenCalledOnce();
  });
});
