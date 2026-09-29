import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/siteService', () => ({
  setAllowedSiteRecording: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import { setAllowedSiteRecording } from '~/lib/siteService';
import { updateBlockRules } from '../../blocker';
import { setAllowedSiteRecordingHandler as handler } from '../../handlers/set-allowed-site-recording';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

describe('set-allowed-site-recording ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setAllowedSiteRecording).mockResolvedValue(true);
  });

  it.each([
    ['domain が無い', { recordTime: true }],
    ['domain が空文字', { domain: '', recordTime: true }],
    ['recordTime が無い', { domain: 'music.youtube.com' }],
    [
      'recordTime が真偽値でない',
      { domain: 'music.youtube.com', recordTime: 1 }
    ]
  ])('%s なら失敗し、何も書かない', async (_label, data) => {
    const result = await invoke<Response>(handler, data);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(setAllowedSiteRecording).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    '「記録する」を %s にし、ルールは作り直さない',
    async (recordTime) => {
      const result = await invoke<Response>(handler, {
        domain: 'music.youtube.com',
        recordTime
      });

      expect(result).toEqual({ success: true });
      expect(setAllowedSiteRecording).toHaveBeenCalledWith(
        'music.youtube.com',
        recordTime
      );
      expect(updateBlockRules).not.toHaveBeenCalled();
    }
  );

  it('許可サイトが無ければ allow-not-found を返す', async () => {
    vi.mocked(setAllowedSiteRecording).mockResolvedValue(false);

    const result = await invoke<Response>(handler, {
      domain: 'youtube.com',
      recordTime: true
    });

    expect(result).toEqual({
      success: false,
      error: { code: 'allow-not-found' }
    });
  });
});
