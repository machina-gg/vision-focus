import { registerMessageHandlers } from './handlers';
import { setupSettingsWatcher } from './listeners/settingsWatcher';
import { setupLifecycleHandlers } from './listeners/lifecycleHandlers';
import { setupAlarmHandlers, createAlarms } from './listeners/alarmHandlers';
import { setupNavigationTracking } from './listeners/navigationTracking';

// Register all listeners
setupSettingsWatcher();
setupLifecycleHandlers();
setupAlarmHandlers();
setupNavigationTracking();

// 画面・コンテンツスクリプトからのメッセージを受け付ける
registerMessageHandlers();

// Create periodic alarms
createAlarms();

// Export for Plasmo
export {};
