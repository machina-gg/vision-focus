import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  setPaused: vi.fn(),
  checkUnblockPassword: vi.fn()
}));

vi.mock('~/background/blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import { checkUnblockPassword, setPaused } from '~/lib/settingsService';
import { updateBlockRules, blockExistingTabs } from '~/background/blocker';
import { togglePauseHandler as handler } from '../../handlers/toggle-pause';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  paused?: boolean;
  error?: MessageError;
}

describe('toggle-pause ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setPaused).mockResolvedValue(undefined);
    vi.mocked(checkUnblockPassword).mockResolvedValue(null);
  });

  describe('入力検証', () => {
    it.each([
      ['body が空', {}],
      ['body が null', null],
      ['paused が boolean でない', { paused: 'true' }]
    ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: { code: 'invalid-request' }
      });
      expect(setPaused).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('paused: true で一時停止状態を保存する', async () => {
    const result = await invoke<Response>(handler, { paused: true });

    expect(result).toEqual({ success: true, paused: true });
    expect(setPaused).toHaveBeenCalledWith(true);
  });

  it('paused: false で再開状態を保存する', async () => {
    const result = await invoke<Response>(handler, { paused: false });

    expect(result).toEqual({ success: true, paused: false });
    expect(setPaused).toHaveBeenCalledWith(false);
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

  it('保存に失敗したら save-failed を返し、ルールを更新しない', async () => {
    vi.mocked(setPaused).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, { paused: false });

    expect(result).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
    expect(updateBlockRules).not.toHaveBeenCalled();
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  describe('パスワード保護', () => {
    it.each([
      ['一時停止は弱める操作として照合する', true, true],
      ['再開は弱めない操作として照合する', false, false]
    ])('%s', async (_label, paused, weakens) => {
      await invoke(handler, { paused, password: 'secret' });

      expect(checkUnblockPassword).toHaveBeenCalledWith('secret', weakens);
    });

    it.each([
      ['required', 'password-required'],
      ['mismatch', 'password-mismatch']
    ] as const)(
      '%s で拒まれたら %s を返し、何も書かない',
      async (rejection, code) => {
        vi.mocked(checkUnblockPassword).mockResolvedValue(rejection);

        const result = await invoke<Response>(handler, { paused: true });

        expect(result).toEqual({ success: false, error: { code } });
        expect(setPaused).not.toHaveBeenCalled();
        expect(updateBlockRules).not.toHaveBeenCalled();
      }
    );

    it('照合で保存領域を読めなければ save-failed を返す', async () => {
      vi.mocked(checkUnblockPassword).mockRejectedValue(new Error('read'));

      const result = await invoke<Response>(handler, { paused: true });

      expect(result).toEqual({
        success: false,
        error: { code: 'save-failed' }
      });
      expect(setPaused).not.toHaveBeenCalled();
    });
  });
});
