import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/blockService', () => ({
  getSiteBlockStatus: vi.fn()
}));

import { getSiteBlockStatus } from '~/lib/blockService';
import { getRemainingTimeHandler as handler } from '../../handlers/get-remaining-time';
import type { SiteBlockStatus } from '~/lib/blockService';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
  data?: unknown;
}

const LIMIT_SECONDS = 1800;

function status(overrides: Partial<SiteBlockStatus> = {}): SiteBlockStatus {
  return {
    site: 'example.com',
    rule: {
      enabled: true,
      timeLimit: { type: 'daily', limitSeconds: LIMIT_SECONDS }
    },
    state: { blocked: false, reason: null, remainingSeconds: 300 },
    ...overrides
  };
}

describe('get-remaining-time ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSiteBlockStatus).mockResolvedValue(status());
  });

  describe('入力検証', () => {
    it.each([
      ['url が空文字', { url: '' }],
      ['url が無い', {}],
      ['url が文字列以外', { url: 123 }],
      ['body が null', null]
    ])('%s なら invalid-url を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: { code: 'invalid-url' }
      });
      expect(getSiteBlockStatus).not.toHaveBeenCalled();
    });
  });

  it('URL のホスト名で判定し、判定の残り時間を返す', async () => {
    const result = await invoke<Response>(handler, {
      url: 'https://www.example.com/page'
    });

    expect(getSiteBlockStatus).toHaveBeenCalledWith('www.example.com');
    expect(result).toEqual({
      success: true,
      data: {
        hasTimeLimit: true,
        remainingSeconds: 300,
        limitType: 'daily',
        limitSeconds: LIMIT_SECONDS
      }
    });
  });

  it('判定が残り時間を持たない（スケジュール外・一時停止中）なら remainingSeconds は null', async () => {
    vi.mocked(getSiteBlockStatus).mockResolvedValue(
      status({ state: { blocked: false, reason: null } })
    );

    const result = await invoke<Response>(handler, {
      url: 'https://example.com'
    });

    expect(result?.data).toMatchObject({
      hasTimeLimit: true,
      remainingSeconds: null
    });
  });

  it('時間制限が設定されていないサイトでも成功として返す', async () => {
    vi.mocked(getSiteBlockStatus).mockResolvedValue(
      status({
        rule: { enabled: true, timeLimit: null },
        state: { blocked: true, reason: 'always_blocked' }
      })
    );

    const result = await invoke<Response>(handler, {
      url: 'https://example.com'
    });

    expect(result).toEqual({
      success: true,
      data: {
        hasTimeLimit: false,
        remainingSeconds: null,
        limitType: null,
        limitSeconds: null
      }
    });
  });

  it.each([
    ['ブロック設定の無いサイト', null],
    [
      'ブロックが無効なサイト',
      status({ rule: { enabled: false, timeLimit: null } })
    ]
  ])('%s なら null を返す', async (_label, value) => {
    vi.mocked(getSiteBlockStatus).mockResolvedValue(value);

    const result = await invoke<Response>(handler, {
      url: 'https://example.com'
    });

    expect(result).toEqual({ success: true, data: null });
  });
});
