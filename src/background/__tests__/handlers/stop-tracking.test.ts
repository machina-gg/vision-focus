import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  stopTracking: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  purgeSite: vi.fn()
}));

import { stopTracking } from '~/lib/siteService';
import { purgeSite } from '~/lib/activityService';
import { stopTrackingHandler as handler } from '../../handlers/stop-tracking';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('stop-tracking ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stopTracking).mockResolvedValue('stopped');
  });

  it('domain が無ければ失敗し、何も消さない', async () => {
    const result = await invoke<Response>(handler, {});

    expect(result?.success).toBe(false);
    expect(stopTracking).not.toHaveBeenCalled();
    expect(purgeSite).not.toHaveBeenCalled();
  });

  it('サイトとその事実を消す（サイトを先に消す）', async () => {
    const result = await invoke<Response>(handler, { domain: 'x.com' });

    expect(result).toEqual({ success: true });
    expect(stopTracking).toHaveBeenCalledWith('x.com');
    expect(purgeSite).toHaveBeenCalledWith('x.com');
    expect(vi.mocked(stopTracking).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(purgeSite).mock.invocationCallOrder[0]
    );
  });

  it('追跡中に無くても事実の列は消す', async () => {
    vi.mocked(stopTracking).mockResolvedValue('not-found');

    const result = await invoke<Response>(handler, { domain: 'x.com' });

    expect(result).toEqual({ success: true });
    expect(purgeSite).toHaveBeenCalledWith('x.com');
  });

  it('ブロック設定か YouTube 機能を持つサイトは止めず、事実も消さない', async () => {
    vi.mocked(stopTracking).mockResolvedValue('in-use');

    const result = await invoke<Response>(handler, { domain: 'x.com' });

    expect(result).toEqual({ success: false, error: { code: 'site-in-use' } });
    expect(purgeSite).not.toHaveBeenCalled();
  });
});
