import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';
import { itemAt } from '~/test/items';

vi.mock('~/lib/settingsService', () => ({
  setScheduleEnabled: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import { setScheduleEnabled } from '~/lib/settingsService';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { toggleScheduleHandler as handler } from '../../handlers/toggle-schedule';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('toggle-schedule ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setScheduleEnabled).mockResolvedValue({
      rejection: null,
      resumed: false
    });
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

  it('一時停止を解かなかったときは、開いているタブをブロックしない', async () => {
    await invoke(handler, { id: 's1', enabled: true });

    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  it('一時停止を解いたときは、ルールを作り直してから開いているタブをブロックする', async () => {
    vi.mocked(setScheduleEnabled).mockResolvedValue({
      rejection: null,
      resumed: true
    });

    const result = await invoke<Response>(handler, {
      id: 's1',
      enabled: true
    });

    expect(result).toEqual({ success: true });
    expect(blockExistingTabs).toHaveBeenCalledOnce();
    expect(
      itemAt(vi.mocked(updateBlockRules).mock.invocationCallOrder, 0)
    ).toBeLessThan(
      itemAt(vi.mocked(blockExistingTabs).mock.invocationCallOrder, 0)
    );
  });

  it('対象が無ければ schedule-not-found を返し、ルールを作り直さない', async () => {
    vi.mocked(setScheduleEnabled).mockResolvedValue({
      rejection: 'not-found'
    });

    const result = await invoke<Response>(handler, {
      id: 'missing',
      enabled: true
    });

    expect(result).toEqual({
      success: false,
      error: { code: 'schedule-not-found' }
    });
    expect(updateBlockRules).not.toHaveBeenCalled();
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(setScheduleEnabled).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      id: 's1',
      enabled: true
    });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });
});
