import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  updateSchedule: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

import { updateSchedule } from '~/lib/settingsService';
import { updateBlockRules } from '../../blocker';
import { updateScheduleHandler as handler } from '../../handlers/update-schedule';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

const input = {
  name: 'Work',
  startTime: '09:00',
  endTime: '24:00',
  days: [0, 6]
};

describe('update-schedule ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateSchedule).mockResolvedValue(null);
  });

  describe('入力検証', () => {
    it.each([
      ['body が null', null],
      ['id が無い', { schedule: input }],
      ['id が空文字', { id: '', schedule: input }],
      ['schedule が無い', { id: 's1' }],
      ['曜日が無い', { id: 's1', schedule: { ...input, days: [] } }],
      [
        '終了時刻の形が違う',
        { id: 's1', schedule: { ...input, endTime: '9:00' } }
      ]
    ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: { code: 'invalid-request' }
      });
      expect(updateSchedule).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
    });
  });

  it('入力値を置き換えてから、応答の前にルールを作り直す', async () => {
    const result = await invoke<Response>(handler, {
      id: 's1',
      schedule: input
    });

    expect(result).toEqual({ success: true });
    expect(updateSchedule).toHaveBeenCalledWith('s1', input);
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('終了時刻 00:00 はその日の終わり（24:00）にして置き換える', async () => {
    await invoke<Response>(handler, {
      id: 's1',
      schedule: { ...input, endTime: '00:00' }
    });

    expect(updateSchedule).toHaveBeenCalledWith('s1', {
      ...input,
      endTime: '24:00'
    });
  });

  it.each([
    ['not-found', 'schedule-not-found'],
    ['overlap', 'schedule-overlap'],
    ['preset-not-found', 'preset-not-found']
  ] as const)(
    '%s で拒まれたら %s を返し、ルールを作り直さない',
    async (rejection, code) => {
      vi.mocked(updateSchedule).mockResolvedValue(rejection);

      const result = await invoke<Response>(handler, {
        id: 's1',
        schedule: input
      });

      expect(result).toEqual({ success: false, error: { code } });
      expect(updateBlockRules).not.toHaveBeenCalled();
    }
  );

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(updateSchedule).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      id: 's1',
      schedule: input
    });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
});
