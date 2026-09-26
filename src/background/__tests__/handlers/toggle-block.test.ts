import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn()
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

import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { trackEvent } from '~/lib/analytics';
import { recordActivity } from '~/lib/activityService';
import { toggleBlockHandler as handler } from '../../handlers/toggle-block';
import { DEFAULT_SETTINGS } from '~/types/storage';

interface Response {
  success: boolean;
  error?: string;
}

const blockItem = {
  id: 'item-1',
  domain: 'example.com',
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true
};

describe('toggle-block ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      blockList: [{ ...blockItem }]
    });
  });

  describe('入力検証', () => {
    it.each([
      ['id が空文字', { id: '', enabled: true }],
      ['id が 100 文字超', { id: 'a'.repeat(101), enabled: true }]
    ])('%s なら Invalid id を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({ success: false, error: 'Invalid id' });
      expect(setSettings).not.toHaveBeenCalled();
    });

    it('enabled が boolean でないなら Invalid enabled value を返す', async () => {
      const result = await invoke<Response>(handler, {
        id: 'item-1',
        enabled: 'true'
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid enabled value'
      });
      expect(setSettings).not.toHaveBeenCalled();
    });

    it('存在しない id なら Item not found を返す', async () => {
      const result = await invoke<Response>(handler, {
        id: 'not-exists',
        enabled: true
      });

      expect(result).toEqual({ success: false, error: 'Item not found' });
      expect(setSettings).not.toHaveBeenCalled();
    });
  });

  describe('有効化（再ブロック）', () => {
    beforeEach(() => {
      vi.mocked(getSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        blockList: [{ ...blockItem, enabled: false }]
      });
    });

    it('enabled を true にして保存しルールを更新する', async () => {
      const result = await invoke<Response>(handler, {
        id: 'item-1',
        enabled: true
      });

      expect(result).toEqual({ success: true });
      expect(setSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          blockList: [expect.objectContaining({ enabled: true })]
        })
      );
      expect(updateBlockRules).toHaveBeenCalledOnce();
    });

    it('既存タブをブロックする', async () => {
      await invoke(handler, { id: 'item-1', enabled: true });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('解除として送信しない', async () => {
      await invoke(handler, { id: 'item-1', enabled: true });

      expect(trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('無効化（ブロック解除）', () => {
    it('enabled を false にして保存する', async () => {
      const result = await invoke<Response>(handler, {
        id: 'item-1',
        enabled: false
      });

      expect(result).toEqual({ success: true });
      expect(setSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          blockList: [expect.objectContaining({ enabled: false })]
        })
      );
    });

    it('既存タブのブロックは行わない', async () => {
      await invoke(handler, { id: 'item-1', enabled: false });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('GA4 へはドメインをハッシュ化して送信する（生ドメインを送らない）', async () => {
      await invoke(handler, { id: 'item-1', enabled: false });

      expect(trackEvent).toHaveBeenCalledWith('block_unblock', {
        domain_hashed: expect.any(String)
      });

      const payload = vi.mocked(trackEvent).mock.calls[0][1] as {
        domain_hashed: string;
      };
      expect(payload.domain_hashed).not.toContain('example.com');
    });
  });

  describe('事実の表（activity）への解除の記録', () => {
    it('トグル OFF で 1 回の解除を記録する', async () => {
      await invoke(handler, { id: 'item-1', enabled: false });

      expect(recordActivity).toHaveBeenCalledOnce();
      expect(recordActivity).toHaveBeenCalledWith({
        kind: 'unblock',
        site: 'example.com',
        at: expect.any(Date)
      });
    });

    it('ワイルドカード表記の項目はサイトキーに正規化して記録する', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        blockList: [{ ...blockItem, domain: '*.Example.com', isWildcard: true }]
      });

      await invoke(handler, { id: 'item-1', enabled: false });

      expect(recordActivity).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'unblock', site: 'example.com' })
      );
    });

    it('トグル ON では記録しない', async () => {
      vi.mocked(getSettings).mockResolvedValue({
        ...DEFAULT_SETTINGS,
        blockList: [{ ...blockItem, enabled: false }]
      });

      await invoke(handler, { id: 'item-1', enabled: true });

      expect(recordActivity).not.toHaveBeenCalled();
    });
  });
});
