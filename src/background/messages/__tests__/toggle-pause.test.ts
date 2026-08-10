import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

// storage をモック
vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn()
}));

// blocker をモック（chrome.declarativeNetRequest に依存するため）
vi.mock('~/background/blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '~/background/blocker';
import handler from '../toggle-pause';
import { DEFAULT_SETTINGS } from '~/types/storage';

describe('toggle-pause ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockResolvedValue({ ...DEFAULT_SETTINGS });
  });

  it('paused: true で一時停止状態を保存する', async () => {
    const result = await invoke<{ success: boolean; paused: boolean }>(
      handler,
      { paused: true }
    );

    expect(result).toEqual({ success: true, paused: true });
    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({ paused: true })
    );
  });

  it('paused: false で再開状態を保存する', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      paused: true
    });

    const result = await invoke<{ success: boolean; paused: boolean }>(
      handler,
      { paused: false }
    );

    expect(result).toEqual({ success: true, paused: false });
    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({ paused: false })
    );
  });

  it('状態変更後は必ずブロックルールを更新する', async () => {
    await invoke(handler, { paused: true });

    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('一時停止時は既存タブをブロックしない', async () => {
    await invoke(handler, { paused: true });

    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  it('再開時は既存タブをブロックする', async () => {
    await invoke(handler, { paused: false });

    expect(blockExistingTabs).toHaveBeenCalledOnce();
  });

  it('他の設定値を壊さない', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      blockList: [
        {
          id: 'a',
          domain: 'example.com',
          isWildcard: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          enabled: true
        }
      ]
    };
    vi.mocked(getSettings).mockResolvedValue(settings);

    await invoke(handler, { paused: true });

    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        paused: true,
        blockList: settings.blockList
      })
    );
  });
});
