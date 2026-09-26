import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  addTrackedSite: vi.fn()
}));

import { addTrackedSite, type AddSiteRejection } from '~/lib/siteService';
import { addTrackedSiteHandler as handler } from '../../handlers/add-tracked-site';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('add-tracked-site ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['空文字', { domain: '' }],
    ['domain が無い', {}],
    ['文字列以外', { domain: 123 }]
  ])('%s なら失敗し、追跡中のサイトを変えない', async (_label, data) => {
    const result = await invoke<Response>(handler, data);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(addTrackedSite).not.toHaveBeenCalled();
  });

  it('ブロックせずに追跡を始める', async () => {
    vi.mocked(addTrackedSite).mockResolvedValue({
      site: 'news.example.org',
      rejection: null
    });

    const result = await invoke<Response>(handler, {
      domain: 'news.example.org'
    });

    expect(result).toEqual({ success: true });
    expect(addTrackedSite).toHaveBeenCalledWith(
      'news.example.org',
      expect.any(Date)
    );
  });

  it.each([
    [
      '既に追跡中',
      { reason: 'duplicate' as const },
      { code: 'already-tracked' }
    ],
    ['形式の誤り', { reason: 'invalid' as const }, { code: 'invalid-domain' }],
    [
      '入れ子',
      {
        reason: 'nested' as const,
        nested: { site: 'google.com', relation: 'ancestor' as const }
      },
      {
        code: 'nested-site',
        domain: 'mail.google.com',
        nested: { site: 'google.com', relation: 'ancestor' }
      }
    ]
  ] satisfies [string, AddSiteRejection, MessageError][])(
    '%s なら理由を返す',
    async (_label, rejection, error) => {
      vi.mocked(addTrackedSite).mockResolvedValue({ site: null, rejection });

      const result = await invoke<Response>(handler, {
        domain: 'mail.google.com'
      });

      expect(result).toEqual({ success: false, error });
    }
  );
});
