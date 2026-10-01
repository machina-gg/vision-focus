import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  addSchedule: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn(),
  getRedirectedHosts: vi.fn()
}));

import { addSchedule } from '~/lib/settingsService';
import {
  blockExistingTabs,
  getRedirectedHosts,
  updateBlockRules
} from '../../blocker';
import { givenRedirectedHosts } from '../redirectedHosts';
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
    givenRedirectedHosts([], []);
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

  it('終了時刻 00:00 はその日の終わり（24:00）にして足す', async () => {
    await invoke<Response>(handler, {
      schedule: { ...input, endTime: '00:00' }
    });

    expect(addSchedule).toHaveBeenCalledWith({ ...input, endTime: '24:00' });
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
  describe('開いているタブを移す条件', () => {
    it('転送していたホストは保存の前に読む', async () => {
      await invoke<Response>(handler, { schedule: input });

      expect(
        vi.mocked(getRedirectedHosts).mock.invocationCallOrder[0]
      ).toBeLessThan(vi.mocked(addSchedule).mock.invocationCallOrder[0] ?? 0);
    });

    it('新たにブロック対象になったホストがあれば、開いているタブを移す', async () => {
      givenRedirectedHosts(['example.com'], ['example.com', 'sns.example']);

      await invoke<Response>(handler, { schedule: input });

      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it.each([
      ['ブロック対象が変わらない', ['example.com'], ['example.com']],
      [
        'ブロック対象が減っただけ',
        ['example.com', 'sns.example'],
        ['example.com']
      ]
    ])('%sなら、開いているタブを移さない', async (_label, before, after) => {
      givenRedirectedHosts(before, after);

      await invoke<Response>(handler, { schedule: input });

      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('保存を拒まれたら、開いているタブを移さない', async () => {
      vi.mocked(addSchedule).mockResolvedValue('overlap');
      givenRedirectedHosts([], ['example.com']);

      await invoke<Response>(handler, { schedule: input });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });
});
