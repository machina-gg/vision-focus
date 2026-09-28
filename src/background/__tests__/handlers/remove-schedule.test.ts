import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  removeSchedule: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

import { removeSchedule } from '~/lib/settingsService';
import { updateBlockRules } from '../../blocker';
import { removeScheduleHandler as handler } from '../../handlers/remove-schedule';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('remove-schedule ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(removeSchedule).mockResolvedValue(null);
  });

  it.each([
    ['body が null', null],
    ['id が無い', {}],
    ['id が空文字', { id: '' }],
    ['id が文字列でない', { id: 1 }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(removeSchedule).not.toHaveBeenCalled();
  });

  it('消してから、応答の前にルールを作り直す', async () => {
    const result = await invoke<Response>(handler, { id: 's1' });

    expect(result).toEqual({ success: true });
    expect(removeSchedule).toHaveBeenCalledWith('s1');
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('対象が無ければ schedule-not-found を返し、ルールを作り直さない', async () => {
    vi.mocked(removeSchedule).mockResolvedValue('not-found');

    const result = await invoke<Response>(handler, { id: 'missing' });

    expect(result).toEqual({
      success: false,
      error: { code: 'schedule-not-found' }
    });
    expect(updateBlockRules).not.toHaveBeenCalled();
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(removeSchedule).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, { id: 's1' });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
});
