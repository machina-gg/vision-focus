import { registerMessageHandlers } from './handlers';
import { setupSettingsWatcher } from './listeners/settingsWatcher';
import { setupLifecycleHandlers } from './listeners/lifecycleHandlers';
import { setupAlarmHandlers, createAlarms } from './listeners/alarmHandlers';
import { setupNavigationTracking } from './listeners/navigationTracking';

export function initBackground(): void {
  setupSettingsWatcher();
  setupLifecycleHandlers();
  setupAlarmHandlers();
  setupNavigationTracking();

  registerMessageHandlers();

  createAlarms();
}
