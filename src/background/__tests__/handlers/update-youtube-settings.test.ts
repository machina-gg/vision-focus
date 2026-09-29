import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  updateYouTubeSite: vi.fn()
}));

vi.mock('~/lib/settingsService', () => ({
  checkUnblockPassword: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  recordActivity: vi.fn()
}));

import { checkUnblockPassword } from '~/lib/settingsService';
import { updateYouTubeSite } from '~/lib/siteService';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { recordActivity } from '~/lib/activityService';
import { updateYouTubeSettingsHandler as handler } from '../../handlers/update-youtube-settings';
import type { YouTubeSettingsInput } from '~/types/messageSchemas';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import { blockedSite, trackedSite, youtubeFeatures } from '~/test/sites';
import { itemAt } from '~/test/items';
import type { SiteEntry } from '~/types/site';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

const LIMIT = { type: 'daily' as const, limitSeconds: 1800 };

const youtube = (
  overrides: Partial<YouTubeSettingsInput> = {}
): YouTubeSettingsInput => ({
  enabled: false,
  blockAccess: false,
  hideShorts: false,
  hideRecommendations: false,
  hideComments: false,
  hideHomeFeed: false,
  timeLimit: null,
  ...overrides
});

// 弱めるかの判定は siteService が書き込み直前の値で行う（siteService のテストで確かめる）。ここでは判定結果を受け取った後を見る
function givenStored(site: SiteEntry | null, weakens = false) {
  vi.mocked(updateYouTubeSite).mockImplementation(
    async (_update, _now, authorize) => {
      const rejection = await authorize(weakens);
      return rejection === null
        ? { rejection: null, before: site }
        : { rejection: { by: 'authorize', rejection }, before: null };
    }
  );
}

const blocking = blockedSite(
  YOUTUBE_DOMAIN,
  {},
  { youtube: youtubeFeatures() }
);
const notBlocking = trackedSite(YOUTUBE_DOMAIN, { youtube: youtubeFeatures() });

describe('update-youtube-settings ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    givenStored(null);
    vi.mocked(checkUnblockPassword).mockResolvedValue(null);
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
    ])('%s なら invalid-request を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: { code: 'invalid-request' }
      });
      expect(updateYouTubeSite).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  describe('youtube.com に書く値', () => {
    it.each([
      [
        '機能とアクセスブロック（時間制限つき）',
        youtube({
          enabled: true,
          blockAccess: true,
          hideShorts: true,
          timeLimit: LIMIT
        }),
        {
          youtube: youtubeFeatures({ hideShorts: true }),
          block: { enabled: true, timeLimit: LIMIT }
        }
      ],
      [
        'アクセスブロック OFF はブロック設定を無効にするだけ（時間制限は保つ）',
        youtube({ enabled: true, hideComments: true, timeLimit: LIMIT }),
        {
          youtube: youtubeFeatures({ hideComments: true }),
          block: { enabled: false, timeLimit: LIMIT }
        }
      ],
      [
        '機能全体を無効にするとアクセスブロックも外れる',
        youtube({ enabled: false, blockAccess: true, hideShorts: true }),
        { youtube: null, block: null }
      ]
    ])('%s', async (_label, value, expected) => {
      const result = await invoke<Response>(handler, { youtube: value });

      expect(result).toEqual({ success: true });
      expect(updateYouTubeSite).toHaveBeenCalledWith(
        expected,
        expect.any(Date),
        expect.any(Function)
      );
      expect(updateBlockRules).toHaveBeenCalledOnce();
    });
  });

  describe('既存タブをブロックする条件', () => {
    it.each([
      ['youtube.com が無い状態から', null],
      ['アクセスブロックが無効な状態から', notBlocking]
    ])('%s アクセスブロックを有効にしたとき', async (_label, stored) => {
      givenStored(stored);

      await invoke(handler, {
        youtube: youtube({ enabled: true, blockAccess: true })
      });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });
  });

  describe('既存タブをブロックしない条件', () => {
    it.each([
      [
        'アクセスブロックが有効のまま他の項目だけ変わった',
        blocking,
        youtube({ enabled: true, blockAccess: true, hideShorts: true })
      ],
      [
        'アクセスブロックが有効から無効になった',
        blocking,
        youtube({ enabled: true, blockAccess: false })
      ],
      [
        'YouTube が有効でもアクセスブロックが無効',
        null,
        youtube({ enabled: true, blockAccess: false })
      ],
      [
        'アクセスブロックが有効でも YouTube 自体が無効',
        null,
        youtube({ enabled: false, blockAccess: true })
      ]
    ])('%s', async (_label, stored, next) => {
      givenStored(stored);

      await invoke(handler, { youtube: next });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('保存に失敗した場合はエラーを返す（例外を外に投げない）', async () => {
    vi.mocked(updateYouTubeSite).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      youtube: youtube({ enabled: true, blockAccess: true })
    });

    expect(result).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
    expect(blockExistingTabs).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  describe('事実の表（activity）への解除の記録', () => {
    it.each([
      [
        'アクセスブロックを無効にした',
        youtube({ enabled: true, blockAccess: false })
      ],
      [
        'YouTube 機能ごと無効にしてアクセスブロックが外れた',
        youtube({ enabled: false, blockAccess: true })
      ]
    ])('%s ら 1 回の解除を記録する', async (_label, next) => {
      givenStored(blocking);

      await invoke(handler, { youtube: next });

      expect(recordActivity).toHaveBeenCalledOnce();
      expect(recordActivity).toHaveBeenCalledWith({
        kind: 'unblock',
        site: 'youtube.com',
        at: expect.any(Date)
      });
    });

    it('保存の後に記録する（youtube.com は追跡中に残るので捨てられない）', async () => {
      givenStored(blocking);

      await invoke(handler, {
        youtube: youtube({ enabled: false, blockAccess: false })
      });

      expect(
        vi.mocked(updateYouTubeSite).mock.invocationCallOrder[0]
      ).toBeLessThan(
        itemAt(vi.mocked(recordActivity).mock.invocationCallOrder, 0)
      );
    });

    it.each([
      [
        '無効から有効',
        notBlocking,
        youtube({ enabled: true, blockAccess: true })
      ],
      [
        '有効のまま',
        blocking,
        youtube({ enabled: true, blockAccess: true, hideShorts: true })
      ],
      ['無効のまま', notBlocking, youtube({ enabled: false })],
      [
        '無効化済みのブロック設定を外す',
        blockedSite(YOUTUBE_DOMAIN, { enabled: false }),
        youtube({ enabled: false })
      ]
    ])('アクセスブロックが%sなら記録しない', async (_label, stored, next) => {
      givenStored(stored);

      await invoke(handler, { youtube: next });

      expect(recordActivity).not.toHaveBeenCalled();
    });
  });

  describe('パスワード保護', () => {
    it.each([true, false])(
      '弱めるか（%s）と添えられたパスワードで照合する',
      async (weakens) => {
        givenStored(blocking, weakens);

        await invoke(handler, {
          youtube: youtube({ enabled: true, blockAccess: false }),
          password: 'secret'
        });

        expect(checkUnblockPassword).toHaveBeenCalledWith('secret', weakens);
      }
    );

    it.each([
      ['required', 'password-required'],
      ['mismatch', 'password-mismatch']
    ] as const)(
      '%s で拒まれたら %s を返し、ルールの更新も記録もしない',
      async (rejection, code) => {
        givenStored(blocking, true);
        vi.mocked(checkUnblockPassword).mockResolvedValue(rejection);

        const result = await invoke<Response>(handler, {
          youtube: youtube({ enabled: true, blockAccess: false })
        });

        expect(result).toEqual({ success: false, error: { code } });
        expect(updateBlockRules).not.toHaveBeenCalled();
        expect(recordActivity).not.toHaveBeenCalled();
      }
    );
  });

  describe('youtube.com の登録の形による拒否', () => {
    it.each([
      [
        '許可サイトとして登録済み',
        { reason: 'allowed' } as const,
        { code: 'already-allowed' }
      ],
      [
        '新しく作ると許可サイトでない子孫と入れ子になる',
        {
          reason: 'nested',
          nested: { site: 'm.youtube.com', relation: 'descendant' }
        } as const,
        {
          code: 'nested-site',
          domain: YOUTUBE_DOMAIN,
          nested: { site: 'm.youtube.com', relation: 'descendant' }
        }
      ]
    ])(
      '%s なら理由を返し、ルールの更新も記録もしない',
      async (_label, rejection, error) => {
        vi.mocked(updateYouTubeSite).mockResolvedValue({
          rejection: { by: 'site', rejection },
          before: null
        });

        const result = await invoke<Response>(handler, {
          youtube: youtube({ enabled: true, blockAccess: true })
        });

        expect(result).toEqual({ success: false, error });
        expect(updateBlockRules).not.toHaveBeenCalled();
        expect(blockExistingTabs).not.toHaveBeenCalled();
        expect(recordActivity).not.toHaveBeenCalled();
      }
    );
  });
});
