import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules } from '../../blocker';
import handler from '../update-time-limit';
import { DEFAULT_SETTINGS } from '~/types/storage';

interface Response {
  success: boolean;
  error?: string;
}

const blockItem = {
  id: 'item-1',
  domain: 'example.com',
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true
};

describe('update-time-limit ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      blockList: [{ ...blockItem }]
    });
  });

  describe('入力検証', () => {
    it.each([
      ['id が空文字', { id: '', timeLimit: null }],
      ['id が無い', { timeLimit: null }],
      ['timeLimit が未指定', { id: 'item-1' }],
      [
        'limitSeconds が 0',
        { id: 'item-1', timeLimit: { type: 'daily', limitSeconds: 0 } }
      ],
      [
        'limitSeconds が負数',
        { id: 'item-1', timeLimit: { type: 'daily', limitSeconds: -60 } }
      ],
      [
        'type が不正',
        { id: 'item-1', timeLimit: { type: 'weekly', limitSeconds: 60 } }
      ]
    ])('%s なら Invalid request body を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: 'Invalid request body'
      });
      expect(setSettings).not.toHaveBeenCalled();
    });
  });

  it('存在しない id なら Block item not found を返す', async () => {
    const result = await invoke<Response>(handler, {
      id: 'not-exists',
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    });

    expect(result).toEqual({
      success: false,
      error: 'Block item not found'
    });
    expect(setSettings).not.toHaveBeenCalled();
  });

  it('日次の時間制限を設定する', async () => {
    const timeLimit = { type: 'daily' as const, limitSeconds: 1800 };

    const result = await invoke<Response>(handler, {
      id: 'item-1',
      timeLimit
    });

    expect(result).toEqual({ success: true });
    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        blockList: [expect.objectContaining({ timeLimit })]
      })
    );
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('時間単位の時間制限を設定する', async () => {
    const timeLimit = { type: 'hourly' as const, limitSeconds: 600 };

    await invoke(handler, { id: 'item-1', timeLimit });

    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        blockList: [expect.objectContaining({ timeLimit })]
      })
    );
  });

  it('timeLimit: null で制限を解除できる', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      blockList: [
        { ...blockItem, timeLimit: { type: 'daily', limitSeconds: 1800 } }
      ]
    });

    const result = await invoke<Response>(handler, {
      id: 'item-1',
      timeLimit: null
    });

    expect(result).toEqual({ success: true });
    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        blockList: [expect.objectContaining({ timeLimit: null })]
      })
    );
  });

  it('保存に失敗した場合はエラーを返す（例外を外に投げない）', async () => {
    vi.mocked(setSettings).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      id: 'item-1',
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    });

    expect(result).toEqual({
      success: false,
      error: 'Failed to update time limit'
    });
  });
});
