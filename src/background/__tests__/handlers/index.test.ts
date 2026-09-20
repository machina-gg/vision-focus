import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  onMessage: vi.fn()
}));

vi.mock('~/lib/messaging', () => ({
  onMessage: mocks.onMessage
}));

import { registerMessageHandlers } from '../../handlers';
import { addBlockHandler } from '../../handlers/add-block';
import { getRemainingTimeHandler } from '../../handlers/get-remaining-time';
import { getStatsHandler } from '../../handlers/get-stats';
import { removeBlockHandler } from '../../handlers/remove-block';
import { toggleBlockHandler } from '../../handlers/toggle-block';
import { togglePauseHandler } from '../../handlers/toggle-pause';
import { trackerHeartbeatHandler } from '../../handlers/tracker-heartbeat';
import { updateTimeLimitHandler } from '../../handlers/update-time-limit';
import { updateYouTubeSettingsHandler } from '../../handlers/update-youtube-settings';

/**
 * name とハンドラの対応は登録側（handlers/index.ts）にしか無いため、
 * 取り違え（別の name に別のハンドラを登録する）をここで検出する
 */
const expected = [
  ['add-block', addBlockHandler],
  ['get-remaining-time', getRemainingTimeHandler],
  ['get-stats', getStatsHandler],
  ['remove-block', removeBlockHandler],
  ['toggle-block', toggleBlockHandler],
  ['toggle-pause', togglePauseHandler],
  ['tracker-heartbeat', trackerHeartbeatHandler],
  ['update-time-limit', updateTimeLimitHandler],
  ['update-youtube-settings', updateYouTubeSettingsHandler]
] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerMessageHandlers', () => {
  it.each(expected)('%s を対応するハンドラで登録する', (name, handler) => {
    registerMessageHandlers();

    expect(mocks.onMessage).toHaveBeenCalledWith(name, handler);
  });

  it('登録するのは対応表にある分だけ', () => {
    registerMessageHandlers();

    expect(mocks.onMessage.mock.calls.map(([name]) => name)).toEqual(
      expected.map(([name]) => name)
    );
  });
});
