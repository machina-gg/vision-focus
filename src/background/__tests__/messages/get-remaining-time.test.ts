import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('../../time-limit', () => ({
  getTimeLimitInfoForUrl: vi.fn()
}));

import { getTimeLimitInfoForUrl } from '../../time-limit';
import handler from '../../messages/get-remaining-time';

interface Response {
  success: boolean;
  error?: string;
  data?: unknown;
}

const info = {
  hasTimeLimit: true,
  remainingSeconds: 300,
  limitSeconds: 1800,
  limitType: 'daily' as const,
  usedSeconds: 1500,
  isExceeded: false
};

describe('get-remaining-time ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTimeLimitInfoForUrl).mockResolvedValue(info);
  });

  describe('入力検証', () => {
    it.each([
      ['url が空文字', { url: '' }],
      ['url が無い', {}],
      ['url が文字列以外', { url: 123 }],
      ['body が null', null]
    ])('%s なら Invalid URL を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({ success: false, error: 'Invalid URL' });
      expect(getTimeLimitInfoForUrl).not.toHaveBeenCalled();
    });
  });

  it('URL の時間制限情報を返す', async () => {
    const result = await invoke<Response>(handler, {
      url: 'https://example.com/page'
    });

    expect(result).toEqual({ success: true, data: info });
    expect(getTimeLimitInfoForUrl).toHaveBeenCalledWith(
      'https://example.com/page'
    );
  });

  it('時間制限が設定されていない URL でも成功として返す', async () => {
    vi.mocked(getTimeLimitInfoForUrl).mockResolvedValue({
      hasTimeLimit: false,
      remainingSeconds: null,
      limitSeconds: null,
      limitType: null,
      usedSeconds: null,
      isExceeded: false
    });

    const result = await invoke<Response>(handler, {
      url: 'https://example.com'
    });

    expect(result?.success).toBe(true);
    expect(result?.data).toMatchObject({ hasTimeLimit: false });
  });
});
