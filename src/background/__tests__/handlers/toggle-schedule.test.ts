import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  setScheduleEnabled: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn(),
  getRedirectedHosts: vi.fn()
}));

import { setScheduleEnabled } from '~/lib/settingsService';
import {
  blockExistingTabs,
  getRedirectedHosts,
  updateBlockRules
} from '../../blocker';
import { givenRedirectedHosts } from '../redirectedHosts';
import { toggleScheduleHandler as handler } from '../../handlers/toggle-schedule';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('toggle-schedule ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setScheduleEnabled).mockResolvedValue(null);
    givenRedirectedHosts([], []);
  });

  it.each([
    ['body が null', null],
    ['id が無い', { enabled: true }],
    ['enabled が無い', { id: 's1' }],
    ['enabled が boolean でない', { id: 's1', enabled: 'true' }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(setScheduleEnabled).not.toHaveBeenCalled();
    expect(updateBlockRules).not.toHaveBeenCalled();
  });

  it('切り替えてから、応答の前にルールを作り直す', async () => {
    const result = await invoke<Response>(handler, {
      id: 's1',
      enabled: false
    });

    expect(result).toEqual({ success: true });
    expect(setScheduleEnabled).toHaveBeenCalledWith('s1', false);
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('対象が無ければ schedule-not-found を返し、ルールを作り直さない', async () => {
    vi.mocked(setScheduleEnabled).mockResolvedValue('not-found');

    const result = await invoke<Response>(handler, {
      id: 'missing',
      enabled: true
    });

    expect(result).toEqual({
      success: false,
      error: { code: 'schedule-not-found' }
    });
    expect(updateBlockRules).not.toHaveBeenCalled();
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(setScheduleEnabled).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      id: 's1',
      enabled: true
    });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
  describe('開いているタブを移す条件', () => {
    it('転送していたホストは保存の前に読む', async () => {
      await invoke<Response>(handler, { id: 's1', enabled: true });

      expect(
        vi.mocked(getRedirectedHosts).mock.invocationCallOrder[0]
      ).toBeLessThan(
        vi.mocked(setScheduleEnabled).mock.invocationCallOrder[0] ?? 0
      );
    });

    it('新たにブロック対象になったホストがあれば、開いているタブを移す', async () => {
      givenRedirectedHosts(['example.com'], ['example.com', 'sns.example']);

      await invoke<Response>(handler, { id: 's1', enabled: true });

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

      await invoke<Response>(handler, { id: 's1', enabled: true });

      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('保存を拒まれたら、開いているタブを移さない', async () => {
      vi.mocked(setScheduleEnabled).mockResolvedValue('not-found');
      givenRedirectedHosts([], ['example.com']);

      await invoke<Response>(handler, { id: 's1', enabled: true });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });
});
