import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';
import { stubI18nWithSubstitutions } from '~/test/i18n';

vi.mock('~/lib/siteService', () => ({
  addTrackedSite: vi.fn()
}));

import { addTrackedSite } from '~/lib/siteService';
import { addTrackedSiteHandler as handler } from '../../handlers/add-tracked-site';

interface Response {
  success: boolean;
  error?: string;
}

stubI18nWithSubstitutions();

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

    expect(result).toEqual({ success: false, error: 'Domain is required' });
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
    ['既に追跡中', { reason: 'duplicate' as const }, 'Site already tracked'],
    [
      '入れ子',
      {
        reason: 'nested' as const,
        nested: { site: 'google.com', relation: 'ancestor' as const }
      },
      'siteErrorInsideTrackedSite(mail.google.com,google.com)'
    ]
  ])('%s なら理由を返す', async (_label, rejection, error) => {
    vi.mocked(addTrackedSite).mockResolvedValue({ site: null, rejection });

    const result = await invoke<Response>(handler, {
      domain: 'mail.google.com'
    });

    expect(result).toEqual({ success: false, error });
  });
});
