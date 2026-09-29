import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  stopTracking: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  purgeSite: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import { stopTracking } from '~/lib/siteService';
import { purgeSite } from '~/lib/activityService';
import { blockExistingTabs, updateBlockRules } from '../../blocker';
import { stopTrackingHandler as handler } from '../../handlers/stop-tracking';
import { itemAt } from '~/test/items';
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
      itemAt(vi.mocked(purgeSite).mock.invocationCallOrder, 0)
    );
  });

  it('止めた後にルールを作り直してから、開いているタブを置き換える（消した許可サイトのホストが上のブロックに入るため）', async () => {
    const result = await invoke<Response>(handler, {
      domain: 'music.youtube.com'
    });

    expect(result).toEqual({ success: true });
    expect(updateBlockRules).toHaveBeenCalledOnce();
    expect(blockExistingTabs).toHaveBeenCalledOnce();
    const stopped = itemAt(vi.mocked(stopTracking).mock.invocationCallOrder, 0);
    const rebuilt = itemAt(
      vi.mocked(updateBlockRules).mock.invocationCallOrder,
      0
    );
    const replaced = itemAt(
      vi.mocked(blockExistingTabs).mock.invocationCallOrder,
      0
    );
    expect(stopped).toBeLessThan(rebuilt);
    expect(rebuilt).toBeLessThan(replaced);
  });

  it('追跡中に無くても事実の列は消す（ルールとタブは触らない）', async () => {
    vi.mocked(stopTracking).mockResolvedValue('not-found');

    const result = await invoke<Response>(handler, { domain: 'x.com' });

    expect(result).toEqual({ success: true });
    expect(purgeSite).toHaveBeenCalledWith('x.com');
    expect(updateBlockRules).not.toHaveBeenCalled();
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  it('ブロック設定か YouTube 機能を持つサイトは止めず、事実も消さない', async () => {
    vi.mocked(stopTracking).mockResolvedValue('in-use');

    const result = await invoke<Response>(handler, { domain: 'x.com' });

    expect(result).toEqual({ success: false, error: { code: 'site-in-use' } });
    expect(purgeSite).not.toHaveBeenCalled();
    expect(updateBlockRules).not.toHaveBeenCalled();
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });
});
