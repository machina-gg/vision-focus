import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  addSchedule: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

import { addSchedule } from '~/lib/settingsService';
import { updateBlockRules } from '../../blocker';
import { addScheduleHandler as handler } from '../../handlers/add-schedule';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

const input = {
  name: 'Work',
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 2, 3],
  presetId: 'p1'
};

describe('add-schedule ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addSchedule).mockResolvedValue(null);
  });

  describe('入力検証', () => {
    it.each([
      ['body が null', null],
      ['schedule が無い', {}],
      ['曜日が無い', { schedule: { ...input, days: [] } }],
      ['曜日が範囲外', { schedule: { ...input, days: [7] } }],
      ['曜日が重複', { schedule: { ...input, days: [1, 1] } }],
      ['名前が空白だけ', { schedule: { ...input, name: '  ' } }],
      ['時刻が空', { schedule: { ...input, startTime: '' } }]
    ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: { code: 'invalid-request' }
      });
      expect(addSchedule).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
    });
  });

  it('入力値を足してから、応答の前にルールを作り直す', async () => {
    const result = await invoke<Response>(handler, { schedule: input });

    expect(result).toEqual({ success: true });
    expect(addSchedule).toHaveBeenCalledWith(input);
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it.each([
    ['overlap', 'schedule-overlap'],
    ['preset-not-found', 'preset-not-found']
  ] as const)(
    '%s で拒まれたら %s を返し、ルールを作り直さない',
    async (rejection, code) => {
      vi.mocked(addSchedule).mockResolvedValue(rejection);

      const result = await invoke<Response>(handler, { schedule: input });

      expect(result).toEqual({ success: false, error: { code } });
      expect(updateBlockRules).not.toHaveBeenCalled();
    }
  );

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(addSchedule).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, { schedule: input });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
    expect(updateBlockRules).not.toHaveBeenCalled();
  });
});
