import { registerMessageHandlers } from './handlers';
import { setupSettingsWatcher } from './listeners/settingsWatcher';
import { setupLifecycleHandlers } from './listeners/lifecycleHandlers';
import { setupAlarmHandlers, createAlarms } from './listeners/alarmHandlers';
import { setupNavigationTracking } from './listeners/navigationTracking';

/** background のリスナーとメッセージハンドラを登録し、定期実行のアラームを作る */
export function initBackground(): void {
  setupSettingsWatcher();
  setupLifecycleHandlers();
  setupAlarmHandlers();
  setupNavigationTracking();

  registerMessageHandlers();

  createAlarms();
}
