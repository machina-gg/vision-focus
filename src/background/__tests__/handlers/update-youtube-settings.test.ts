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

vi.mock('~/lib/activityService', () => ({
  appendActivity: vi.fn()
}));

import { getSettings, setSettings } from '~/lib/storage';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { appendActivity } from '~/lib/activityService';
import { updateYouTubeSettingsHandler as handler } from '../../handlers/update-youtube-settings';
import { DEFAULT_SETTINGS, DEFAULT_YOUTUBE_SETTINGS } from '~/types/storage';
import type { YouTubeSettings } from '~/types/storage';

interface Response {
  success: boolean;
  error?: string;
}

const youtube = (
  overrides: Partial<YouTubeSettings> = {}
): YouTubeSettings => ({
  ...DEFAULT_YOUTUBE_SETTINGS,
  ...overrides
});

/** 保存前の YouTube 設定を差し替える */
function givenStoredYouTube(stored: YouTubeSettings) {
  vi.mocked(getSettings).mockResolvedValue({
    ...DEFAULT_SETTINGS,
    youtube: stored
  });
}

describe('update-youtube-settings ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    givenStoredYouTube(youtube());
  });

  describe('入力検証', () => {
    it.each([
      ['body が空', {}],
      ['youtube が null', { youtube: null }],
      [
        'enabled が boolean でない',
        { youtube: { ...youtube(), enabled: 'yes' } }
      ],
      ['必須項目が欠けている', { youtube: { enabled: true } }],
      [
        'timeLimit の type が不正',
        {
          youtube: {
            ...youtube(),
            timeLimit: { type: 'weekly', limitSeconds: 60 }
          }
        }
      ]
    ])('%s なら Invalid request body を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: 'Invalid request body'
      });
      expect(setSettings).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('YouTube 設定を保存してブロックルールを更新する', async () => {
    const next = youtube({ enabled: true, hideShorts: true });

    const result = await invoke<Response>(handler, { youtube: next });

    expect(result).toEqual({ success: true });
    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({ youtube: expect.objectContaining(next) })
    );
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('時間制限の変更も保存できる', async () => {
    const timeLimit = { type: 'daily' as const, limitSeconds: 1800 };

    await invoke(handler, {
      youtube: youtube({ enabled: true, blockAccess: true, timeLimit })
    });

    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        youtube: expect.objectContaining({ timeLimit })
      })
    );
  });

  describe('既存タブをブロックする条件', () => {
    it('アクセスブロックが無効から有効になったとき', async () => {
      givenStoredYouTube(youtube({ enabled: true, blockAccess: false }));

      await invoke(handler, {
        youtube: youtube({ enabled: true, blockAccess: true })
      });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('YouTube 自体が有効化され、同時にアクセスブロックも有効なとき', async () => {
      givenStoredYouTube(youtube({ enabled: false, blockAccess: true }));

      await invoke(handler, {
        youtube: youtube({ enabled: true, blockAccess: true })
      });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('サービスワーカー再起動後の初回変更でも呼ばれる（前回状態に依存しない）', async () => {
      // ハンドラは毎回ストレージから保存前の設定を読むため、
      // モジュール変数の前回状態が無くても判定できる（#392）
      givenStoredYouTube(youtube({ enabled: true, blockAccess: false }));

      const result = await invoke<Response>(handler, {
        youtube: youtube({ enabled: true, blockAccess: true })
      });

      expect(result).toEqual({ success: true });
      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });
  });

  describe('既存タブをブロックしない条件', () => {
    it('アクセスブロックが有効のまま他の項目だけ変わったとき', async () => {
      givenStoredYouTube(youtube({ enabled: true, blockAccess: true }));

      await invoke(handler, {
        youtube: youtube({ enabled: true, blockAccess: true, hideShorts: true })
      });

      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('アクセスブロックが有効から無効になったとき', async () => {
      givenStoredYouTube(youtube({ enabled: true, blockAccess: true }));

      await invoke(handler, {
        youtube: youtube({ enabled: true, blockAccess: false })
      });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('YouTube が有効でもアクセスブロックが無効なとき', async () => {
      givenStoredYouTube(youtube({ enabled: false, blockAccess: false }));

      await invoke(handler, {
        youtube: youtube({ enabled: true, blockAccess: false })
      });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('アクセスブロックが有効でも YouTube 自体が無効なとき', async () => {
      givenStoredYouTube(youtube({ enabled: false, blockAccess: false }));

      await invoke(handler, {
        youtube: youtube({ enabled: false, blockAccess: true })
      });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('保存に失敗した場合はエラーを返す（例外を外に投げない）', async () => {
    vi.mocked(setSettings).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      youtube: youtube({ enabled: true, blockAccess: true })
    });

    expect(result).toEqual({
      success: false,
      error: 'Failed to update YouTube settings'
    });
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  describe('事実の表（activity）への解除の記録', () => {
    beforeEach(() => {
      // 前のテストが差し替えた保存失敗を戻す（clearAllMocks は実装を戻さない）
      vi.mocked(setSettings).mockResolvedValue(undefined);
    });

    it('アクセスブロックが有効から無効になったら 1 回の解除を記録する', async () => {
      givenStoredYouTube(youtube({ enabled: true, blockAccess: true }));

      await invoke(handler, {
        youtube: youtube({ enabled: true, blockAccess: false })
      });

      expect(appendActivity).toHaveBeenCalledOnce();
      expect(appendActivity).toHaveBeenCalledWith({
        kind: 'unblock',
        site: 'youtube.com',
        at: expect.any(Date)
      });
    });

    it('保存より先に記録する（保存後は youtube.com が追跡中の集合から外れうる）', async () => {
      givenStoredYouTube(youtube({ enabled: true, blockAccess: true }));

      await invoke(handler, {
        youtube: youtube({ enabled: false, blockAccess: true })
      });

      expect(
        vi.mocked(appendActivity).mock.invocationCallOrder[0]
      ).toBeLessThan(vi.mocked(setSettings).mock.invocationCallOrder[0]);
    });

    it('YouTube 機能ごと無効にしてアクセスブロックが外れたときも記録する', async () => {
      givenStoredYouTube(youtube({ enabled: true, blockAccess: true }));

      await invoke(handler, {
        youtube: youtube({ enabled: false, blockAccess: true })
      });

      expect(appendActivity).toHaveBeenCalledOnce();
    });

    it.each([
      [
        '無効から有効',
        youtube({ enabled: true, blockAccess: false }),
        youtube({ enabled: true, blockAccess: true })
      ],
      [
        '有効のまま',
        youtube({ enabled: true, blockAccess: true }),
        youtube({ enabled: true, blockAccess: true, hideShorts: true })
      ],
      [
        '無効のまま',
        youtube({ enabled: true, blockAccess: false }),
        youtube({ enabled: false, blockAccess: false })
      ]
    ])('アクセスブロックが%sなら記録しない', async (_label, stored, next) => {
      givenStoredYouTube(stored);

      await invoke(handler, { youtube: next });

      expect(appendActivity).not.toHaveBeenCalled();
    });
  });
});
