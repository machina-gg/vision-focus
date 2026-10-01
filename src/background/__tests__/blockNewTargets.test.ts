import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn(),
  getRedirectedHosts: vi.fn()
}));

import {
  blockExistingTabs,
  getRedirectedHosts,
  updateBlockRules
} from '../blocker';
import { updateBlockRulesAndBlockNewTargets } from '../blockNewTargets';

describe('updateBlockRulesAndBlockNewTargets', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('ルールを作り直してから開いているタブを移す', async () => {
    vi.mocked(getRedirectedHosts).mockResolvedValue(['example.com']);

    await updateBlockRulesAndBlockNewTargets([]);

    expect(updateBlockRules).toHaveBeenCalledOnce();
    expect(blockExistingTabs).toHaveBeenCalledOnce();
    expect(
      vi.mocked(updateBlockRules).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(blockExistingTabs).mock.invocationCallOrder[0] ?? 0
    );
  });

  it.each([
    ['対象が無い状態から増えた', [], ['example.com']],
    [
      '元からあった対象に加えて別の対象が増えた',
      ['example.com'],
      ['example.com', 'sns.example']
    ],
    ['件数は同じまま対象が入れ替わった', ['example.com'], ['sns.example']]
  ])('%sときは開いているタブを移す', async (_label, before, after) => {
    vi.mocked(getRedirectedHosts).mockResolvedValue(after);

    await updateBlockRulesAndBlockNewTargets(before);

    expect(blockExistingTabs).toHaveBeenCalledOnce();
  });

  it.each([
    ['対象が変わらない', ['example.com'], ['example.com']],
    ['対象が減った', ['example.com', 'sns.example'], ['example.com']],
    ['対象が無くなった', ['example.com'], []],
    ['前も後も対象が無い', [], []]
  ])('%sときは開いているタブを移さない', async (_label, before, after) => {
    vi.mocked(getRedirectedHosts).mockResolvedValue(after);

    await updateBlockRulesAndBlockNewTargets(before);

    expect(updateBlockRules).toHaveBeenCalledOnce();
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  it('ルールの作り直しに失敗したら、開いているタブを移さずに失敗を返す', async () => {
    vi.mocked(updateBlockRules).mockRejectedValue(new Error('rules failed'));
    vi.mocked(getRedirectedHosts).mockResolvedValue(['example.com']);

    await expect(updateBlockRulesAndBlockNewTargets([])).rejects.toThrow(
      'rules failed'
    );
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });
});
