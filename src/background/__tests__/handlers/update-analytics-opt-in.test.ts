import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  setAnalyticsOptIn: vi.fn()
}));

import { setAnalyticsOptIn } from '~/lib/settingsService';
import { updateAnalyticsOptInHandler as handler } from '../../handlers/update-analytics-opt-in';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('update-analytics-opt-in ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setAnalyticsOptIn).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['body が null', null],
    ['enabled が無い', {}],
    ['enabled が boolean でない', { enabled: 'true' }]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(setAnalyticsOptIn).not.toHaveBeenCalled();
  });

  it('同意・拒否を、受け取った時刻とともに保存する', async () => {
    vi.useFakeTimers({ now: new Date('2026-01-02T03:04:05.000Z') });

    const result = await invoke<Response>(handler, { enabled: false });

    expect(result).toEqual({ success: true });
    expect(setAnalyticsOptIn).toHaveBeenCalledWith(
      false,
      new Date('2026-01-02T03:04:05.000Z')
    );
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(setAnalyticsOptIn).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, { enabled: true });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
});
