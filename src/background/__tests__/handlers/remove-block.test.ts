import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  removeBlock: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  recordActivity: vi.fn()
}));

import { removeBlock } from '~/lib/siteService';
import { updateBlockRules } from '../../blocker';
import { recordActivity } from '~/lib/activityService';
import { removeBlockHandler as handler } from '../../handlers/remove-block';
import type { BlockRule } from '~/types/site';

const rule = (enabled: boolean): BlockRule => ({
  enabled,
  addedAt: '2026-01-01T00:00:00.000Z',
  timeLimit: null
});

describe('remove-block ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(removeBlock).mockResolvedValue(rule(true));
  });

  it.each([
    ['domain が空文字', { domain: '' }],
    ['domain が無い', {}],
    ['domain が文字列以外', { domain: 123 }],
    ['domain が長すぎる', { domain: 'a'.repeat(254) }]
  ])('%s の場合は失敗し、何も変えない', async (_label, data) => {
    const result = await invoke<{ success: boolean }>(handler, data);

    expect(result).toEqual({ success: false });
    expect(removeBlock).not.toHaveBeenCalled();
    expect(updateBlockRules).not.toHaveBeenCalled();
  });

  it('ブロック設定を外し、ルールを作り直す（サイトは追跡中に残る）', async () => {
    const result = await invoke<{ success: boolean }>(handler, {
      domain: 'example.com'
    });

    expect(result).toEqual({ success: true });
    expect(removeBlock).toHaveBeenCalledWith('example.com');
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('効いていたブロックを外したら、保存の後に解除を 1 回記録する', async () => {
    await invoke(handler, { domain: 'example.com' });

    expect(recordActivity).toHaveBeenCalledWith({
      kind: 'unblock',
      site: 'example.com',
      at: expect.any(Date)
    });
    expect(vi.mocked(removeBlock).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(recordActivity).mock.invocationCallOrder[0]
    );
  });

  it('無効化済みのブロックを外しても解除は記録しない', async () => {
    vi.mocked(removeBlock).mockResolvedValue(rule(false));

    await invoke(handler, { domain: 'example.com' });

    expect(updateBlockRules).toHaveBeenCalledOnce();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it('ブロック設定が無ければ何もせず成功を返す', async () => {
    vi.mocked(removeBlock).mockResolvedValue(null);

    const result = await invoke(handler, { domain: 'example.com' });

    expect(result).toEqual({ success: true });
    expect(updateBlockRules).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });
});
