import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  addBlock: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import { addBlock, type AddSiteRejection } from '~/lib/siteService';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { addBlockHandler as handler } from '../../handlers/add-block';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('add-block ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addBlock).mockResolvedValue({
      site: 'example.com',
      rejection: null
    });
  });

  it('domain が空なら失敗し、追跡中のサイトを変えない', async () => {
    const result = await invoke<Response>(handler, { domain: '' });

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(addBlock).not.toHaveBeenCalled();
  });

  it('入力をそのまま追跡中のサイトへの追加に渡し、ルールを作り直して既存タブをブロックする', async () => {
    const result = await invoke<Response>(handler, {
      domain: 'https://www.example.com/'
    });

    expect(result).toEqual({ success: true });
    expect(addBlock).toHaveBeenCalledWith(
      'https://www.example.com/',
      expect.any(Date)
    );
    expect(updateBlockRules).toHaveBeenCalledOnce();
    expect(blockExistingTabs).toHaveBeenCalledOnce();
  });

  it.each([
    ['形式の誤り', { reason: 'invalid' as const }, { code: 'invalid-domain' }],
    [
      '既にブロックリストにある',
      { reason: 'duplicate' as const },
      { code: 'already-blocked' }
    ],
    [
      '追跡中のサイトのサブドメイン',
      {
        reason: 'nested' as const,
        nested: { site: 'youtube.com', relation: 'ancestor' as const }
      },
      {
        code: 'nested-site',
        domain: 'm.youtube.com',
        nested: { site: 'youtube.com', relation: 'ancestor' }
      }
    ],
    [
      '追跡中のサイトの親ドメイン',
      {
        reason: 'nested' as const,
        nested: { site: 'mail.google.com', relation: 'descendant' as const }
      },
      {
        code: 'nested-site',
        domain: 'm.youtube.com',
        nested: { site: 'mail.google.com', relation: 'descendant' }
      }
    ]
  ] satisfies [string, AddSiteRejection, MessageError][])(
    '%s なら理由を返し、ルールを作り直さない',
    async (_label, rejection, error) => {
      vi.mocked(addBlock).mockResolvedValue({ site: null, rejection });

      const result = await invoke<Response>(handler, {
        domain: 'm.youtube.com'
      });

      expect(result).toEqual({ success: false, error });
      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    }
  );
});
