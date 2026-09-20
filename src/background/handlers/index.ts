/**
 * background のメッセージハンドラの登録。
 *
 * ハンドラは素の関数として各ファイルに置き、name との対応をここ 1 箇所に集約する。
 */

import { onMessage } from '~/lib/messaging';
import { addBlockHandler } from './add-block';
import { getRemainingTimeHandler } from './get-remaining-time';
import { getStatsHandler } from './get-stats';
import { importSettingsHandler } from './import-settings';
import { removeBlockHandler } from './remove-block';
import { toggleBlockHandler } from './toggle-block';
import { togglePauseHandler } from './toggle-pause';
import { trackerHeartbeatHandler } from './tracker-heartbeat';
import { updateTimeLimitHandler } from './update-time-limit';
import { updateYouTubeSettingsHandler } from './update-youtube-settings';

/** 全メッセージハンドラを chrome.runtime.onMessage に登録する */
export function registerMessageHandlers(): void {
  onMessage('add-block', addBlockHandler);
  onMessage('get-remaining-time', getRemainingTimeHandler);
  onMessage('get-stats', getStatsHandler);
  onMessage('import-settings', importSettingsHandler);
  onMessage('remove-block', removeBlockHandler);
  onMessage('toggle-block', toggleBlockHandler);
  onMessage('toggle-pause', togglePauseHandler);
  onMessage('tracker-heartbeat', trackerHeartbeatHandler);
  onMessage('update-time-limit', updateTimeLimitHandler);
  onMessage('update-youtube-settings', updateYouTubeSettingsHandler);
}
