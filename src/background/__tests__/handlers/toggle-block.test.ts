import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  setBlockEnabled: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

vi.mock('~/lib/analytics', () => ({
  trackEvent: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  recordActivity: vi.fn()
}));

import { setBlockEnabled } from '~/lib/siteService';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { trackEvent } from '~/lib/analytics';
import { recordActivity } from '~/lib/activityService';
import { toggleBlockHandler as handler } from '../../handlers/toggle-block';
import type { BlockRule } from '~/types/site';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

const before = (enabled: boolean): BlockRule => ({
  enabled,
  addedAt: '2026-01-01T00:00:00.000Z',
  timeLimit: null
});

describe('toggle-block ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setBlockEnabled).mockResolvedValue(before(true));
  });

  describe('入力検証', () => {
    it.each([
      ['domain が空文字', { domain: '', enabled: true }],
      ['domain が長すぎる', { domain: 'a'.repeat(254), enabled: true }],
      ['enabled が boolean でない', { domain: 'example.com', enabled: 'true' }]
    ])('%s なら失敗し、何も変えない', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: { code: 'invalid-request' }
      });
      expect(setBlockEnabled).not.toHaveBeenCalled();
    });

    it('ブロック設定を持たないサイトなら block-not-found を返す', async () => {
      vi.mocked(setBlockEnabled).mockResolvedValue(null);

      const result = await invoke<Response>(handler, {
        domain: 'not-exists.com',
        enabled: true
      });

      expect(result).toEqual({
        success: false,
        error: { code: 'block-not-found' }
      });
      expect(updateBlockRules).not.toHaveBeenCalled();
    });
  });

  describe('有効化（再ブロック）', () => {
    beforeEach(() => {
      vi.mocked(setBlockEnabled).mockResolvedValue(before(false));
    });

    it('block.enabled を true にしてルールを更新し、既存タブをブロックする', async () => {
      const result = await invoke<Response>(handler, {
        domain: 'example.com',
        enabled: true
      });

      expect(result).toEqual({ success: true });
      expect(setBlockEnabled).toHaveBeenCalledWith('example.com', true);
      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('解除として送信も記録もしない', async () => {
      await invoke(handler, { domain: 'example.com', enabled: true });

      expect(trackEvent).not.toHaveBeenCalled();
      expect(recordActivity).not.toHaveBeenCalled();
    });
  });

  describe('無効化（ブロック解除）', () => {
    it('block.enabled を false にし、既存タブのブロックは行わない', async () => {
      const result = await invoke<Response>(handler, {
        domain: 'example.com',
        enabled: false
      });

      expect(result).toEqual({ success: true });
      expect(setBlockEnabled).toHaveBeenCalledWith('example.com', false);
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('GA4 へはドメインをハッシュ化して送信する（生ドメインを送らない）', async () => {
      await invoke(handler, { domain: 'example.com', enabled: false });

      expect(trackEvent).toHaveBeenCalledWith('block_unblock', {
        domain_hashed: expect.any(String)
      });

      const payload = vi.mocked(trackEvent).mock.calls[0][1] as {
        domain_hashed: string;
      };
      expect(payload.domain_hashed).not.toContain('example.com');
    });

    it('効いていたブロックを外したら 1 回の解除を記録する', async () => {
      await invoke(handler, { domain: 'example.com', enabled: false });

      expect(recordActivity).toHaveBeenCalledOnce();
      expect(recordActivity).toHaveBeenCalledWith({
        kind: 'unblock',
        site: 'example.com',
        at: expect.any(Date)
      });
    });

    it('既に無効なブロックを OFF にしても解除は数えない', async () => {
      vi.mocked(setBlockEnabled).mockResolvedValue(before(false));

      await invoke(handler, { domain: 'example.com', enabled: false });

      expect(recordActivity).not.toHaveBeenCalled();
      expect(trackEvent).not.toHaveBeenCalled();
    });
  });
});
