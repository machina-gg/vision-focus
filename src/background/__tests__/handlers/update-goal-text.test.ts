import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  setGoalText: vi.fn()
}));

import { setGoalText } from '~/lib/settingsService';
import { updateGoalTextHandler as handler } from '../../handlers/update-goal-text';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('update-goal-text ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setGoalText).mockResolvedValue(undefined);
  });

  it.each([
    ['body が null', null],
    ['goalText が無い', {}],
    ['goalText が空', { goalText: '' }],
    ['goalText が空白だけ', { goalText: ' \n ' }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(setGoalText).not.toHaveBeenCalled();
  });

  it('目標文を書き換える', async () => {
    const result = await invoke<Response>(handler, { goalText: 'Ship it' });

    expect(result).toEqual({ success: true });
    expect(setGoalText).toHaveBeenCalledWith('Ship it');
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(setGoalText).mockRejectedValue(new Error('storage full'));

    expect(await invoke<Response>(handler, { goalText: 'Ship it' })).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
  });
});
