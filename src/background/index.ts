import { setupSettingsWatcher } from './listeners/settingsWatcher';
import { setupLifecycleHandlers } from './listeners/lifecycleHandlers';
import { setupAlarmHandlers, createAlarms } from './listeners/alarmHandlers';
import { setupNavigationTracking } from './listeners/navigationTracking';

// Register all listeners
setupSettingsWatcher();
setupLifecycleHandlers();
setupAlarmHandlers();
setupNavigationTracking();

// Create periodic alarms
createAlarms();

// Export for Plasmo
export {};
