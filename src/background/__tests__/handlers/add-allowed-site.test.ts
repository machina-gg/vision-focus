import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  addAllowedSite: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import { addAllowedSite, type AddSiteRejection } from '~/lib/siteService';
import { blockExistingTabs, updateBlockRules } from '../../blocker';
import { addAllowedSiteHandler as handler } from '../../handlers/add-allowed-site';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('add-allowed-site ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['空文字', { domain: '' }],
    ['domain が無い', {}],
    ['文字列以外', { domain: 123 }],
    ['本文が無い', undefined]
  ])('%s なら失敗し、登録もルールも変えない', async (_label, data) => {
    const result = await invoke<Response>(handler, data);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(addAllowedSite).not.toHaveBeenCalled();
    expect(updateBlockRules).not.toHaveBeenCalled();
  });

  it('許可サイトにしてルールを作り直し、開いているタブは置き換えない', async () => {
    vi.mocked(addAllowedSite).mockResolvedValue({
      site: 'music.youtube.com',
      rejection: null
    });

    const result = await invoke<Response>(handler, {
      domain: 'music.youtube.com'
    });

    expect(result).toEqual({ success: true });
    expect(addAllowedSite).toHaveBeenCalledWith(
      'music.youtube.com',
      expect.any(Date)
    );
    expect(updateBlockRules).toHaveBeenCalledOnce();
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  it.each([
    ['形式の誤り', { reason: 'invalid' as const }, { code: 'invalid-domain' }],
    [
      'ブロックの登録',
      { reason: 'blocked' as const },
      { code: 'already-blocked' }
    ],
    [
      '規則なしの登録',
      { reason: 'tracked' as const },
      { code: 'already-tracked' }
    ],
    [
      '許可サイトでない子孫がある',
      {
        reason: 'nested' as const,
        nested: { site: 'music.youtube.com', relation: 'descendant' as const }
      },
      {
        code: 'nested-site',
        domain: 'youtube.com',
        nested: { site: 'music.youtube.com', relation: 'descendant' }
      }
    ]
  ] satisfies [string, AddSiteRejection, MessageError][])(
    '%s なら理由を返し、ルールを作り直さない',
    async (_label, rejection, error) => {
      vi.mocked(addAllowedSite).mockResolvedValue({ site: null, rejection });

      const result = await invoke<Response>(handler, {
        domain: 'youtube.com'
      });

      expect(result).toEqual({ success: false, error });
      expect(updateBlockRules).not.toHaveBeenCalled();
    }
  );
});
