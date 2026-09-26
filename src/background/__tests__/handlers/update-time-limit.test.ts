import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  setTimeLimit: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

import { setTimeLimit } from '~/lib/siteService';
import { updateBlockRules } from '../../blocker';
import { updateTimeLimitHandler as handler } from '../../handlers/update-time-limit';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('update-time-limit ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setTimeLimit).mockResolvedValue(true);
  });

  describe('入力検証', () => {
    it.each([
      ['domain が空文字', { domain: '', timeLimit: null }],
      ['domain が無い', { timeLimit: null }],
      ['timeLimit が未指定', { domain: 'example.com' }],
      [
        'limitSeconds が 0',
        { domain: 'example.com', timeLimit: { type: 'daily', limitSeconds: 0 } }
      ],
      [
        'limitSeconds が負数',
        {
          domain: 'example.com',
          timeLimit: { type: 'daily', limitSeconds: -60 }
        }
      ],
      [
        'type が不正',
        {
          domain: 'example.com',
          timeLimit: { type: 'weekly', limitSeconds: 60 }
        }
      ]
    ])('%s なら invalid-request を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: { code: 'invalid-request' }
      });
      expect(setTimeLimit).not.toHaveBeenCalled();
    });
  });

  it('ブロック設定を持たないサイトなら block-not-found を返す', async () => {
    vi.mocked(setTimeLimit).mockResolvedValue(false);

    const result = await invoke<Response>(handler, {
      domain: 'not-exists.com',
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    });

    expect(result).toEqual({
      success: false,
      error: { code: 'block-not-found' }
    });
    expect(updateBlockRules).not.toHaveBeenCalled();
  });

  it('日次の時間制限を設定してルールを作り直す', async () => {
    const timeLimit = { type: 'daily' as const, limitSeconds: 1800 };

    const result = await invoke<Response>(handler, {
      domain: 'example.com',
      timeLimit
    });

    expect(result).toEqual({ success: true });
    expect(setTimeLimit).toHaveBeenCalledWith('example.com', timeLimit);
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('timeLimit: null で制限を解除できる', async () => {
    const result = await invoke<Response>(handler, {
      domain: 'example.com',
      timeLimit: null
    });

    expect(result).toEqual({ success: true });
    expect(setTimeLimit).toHaveBeenCalledWith('example.com', null);
  });

  it('保存に失敗した場合はエラーを返す（例外を外に投げない）', async () => {
    vi.mocked(setTimeLimit).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      domain: 'example.com',
      timeLimit: { type: 'daily', limitSeconds: 1800 }
    });

    expect(result).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
  });
});
