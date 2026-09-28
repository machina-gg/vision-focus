import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  onMessage: vi.fn()
}));

vi.mock('~/lib/messaging', () => ({
  onMessage: mocks.onMessage
}));

import { registerMessageHandlers } from '../../handlers';
import { addBlockHandler } from '../../handlers/add-block';
import { addScheduleHandler } from '../../handlers/add-schedule';
import { addTrackedSiteHandler } from '../../handlers/add-tracked-site';
import { applyPresetHandler } from '../../handlers/apply-preset';
import { createPresetHandler } from '../../handlers/create-preset';
import { deletePresetHandler } from '../../handlers/delete-preset';
import { getRemainingTimeHandler } from '../../handlers/get-remaining-time';
import { importSettingsHandler } from '../../handlers/import-settings';
import { removeBlockHandler } from '../../handlers/remove-block';
import { removeScheduleHandler } from '../../handlers/remove-schedule';
import { resetActivityHandler } from '../../handlers/reset-activity';
import { stopTrackingHandler } from '../../handlers/stop-tracking';
import { toggleBlockHandler } from '../../handlers/toggle-block';
import { togglePauseHandler } from '../../handlers/toggle-pause';
import { toggleScheduleHandler } from '../../handlers/toggle-schedule';
import { trackerHeartbeatHandler } from '../../handlers/tracker-heartbeat';
import { updateAnalyticsOptInHandler } from '../../handlers/update-analytics-opt-in';
import { updateGoalTextHandler } from '../../handlers/update-goal-text';
import { updateNotificationsHandler } from '../../handlers/update-notifications';
import { updatePresetHandler } from '../../handlers/update-preset';
import { updateScheduleHandler } from '../../handlers/update-schedule';
import { updateTimeLimitHandler } from '../../handlers/update-time-limit';
import { updateUnblockConfirmHandler } from '../../handlers/update-unblock-confirm';
import { updateYouTubeSettingsHandler } from '../../handlers/update-youtube-settings';

const expected = [
  ['add-block', addBlockHandler],
  ['add-schedule', addScheduleHandler],
  ['add-tracked-site', addTrackedSiteHandler],
  ['apply-preset', applyPresetHandler],
  ['create-preset', createPresetHandler],
  ['delete-preset', deletePresetHandler],
  ['get-remaining-time', getRemainingTimeHandler],
  ['import-settings', importSettingsHandler],
  ['remove-block', removeBlockHandler],
  ['remove-schedule', removeScheduleHandler],
  ['reset-activity', resetActivityHandler],
  ['stop-tracking', stopTrackingHandler],
  ['toggle-block', toggleBlockHandler],
  ['toggle-pause', togglePauseHandler],
  ['toggle-schedule', toggleScheduleHandler],
  ['tracker-heartbeat', trackerHeartbeatHandler],
  ['update-analytics-opt-in', updateAnalyticsOptInHandler],
  ['update-goal-text', updateGoalTextHandler],
  ['update-notifications', updateNotificationsHandler],
  ['update-preset', updatePresetHandler],
  ['update-schedule', updateScheduleHandler],
  ['update-time-limit', updateTimeLimitHandler],
  ['update-unblock-confirm', updateUnblockConfirmHandler],
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
