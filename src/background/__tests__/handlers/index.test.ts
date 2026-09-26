import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  onMessage: vi.fn()
}));

vi.mock('~/lib/messaging', () => ({
  onMessage: mocks.onMessage
}));

import { registerMessageHandlers } from '../../handlers';
import { addBlockHandler } from '../../handlers/add-block';
import { addTrackedSiteHandler } from '../../handlers/add-tracked-site';
import { getRemainingTimeHandler } from '../../handlers/get-remaining-time';
import { importSettingsHandler } from '../../handlers/import-settings';
import { removeBlockHandler } from '../../handlers/remove-block';
import { resetActivityHandler } from '../../handlers/reset-activity';
import { stopTrackingHandler } from '../../handlers/stop-tracking';
import { toggleBlockHandler } from '../../handlers/toggle-block';
import { togglePauseHandler } from '../../handlers/toggle-pause';
import { trackerHeartbeatHandler } from '../../handlers/tracker-heartbeat';
import { updateTimeLimitHandler } from '../../handlers/update-time-limit';
import { updateYouTubeSettingsHandler } from '../../handlers/update-youtube-settings';

const expected = [
  ['add-block', addBlockHandler],
  ['add-tracked-site', addTrackedSiteHandler],
  ['get-remaining-time', getRemainingTimeHandler],
  ['import-settings', importSettingsHandler],
  ['remove-block', removeBlockHandler],
  ['reset-activity', resetActivityHandler],
  ['stop-tracking', stopTrackingHandler],
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
