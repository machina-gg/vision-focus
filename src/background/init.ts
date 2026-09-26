/**
 * background の初期化処理。
 *
 * ⚠ エントリ（src/entrypoints/background.ts）と分けてあるのは、
 * エントリが WXT の `#imports`（ビルド時の仮想モジュール）に依存しており、
 * vitest からは解決できないため。初期化の中身はこちらに置き、エントリは呼ぶだけにする
 */

import { registerMessageHandlers } from './handlers';
import { setupSettingsWatcher } from './listeners/settingsWatcher';
import { setupLifecycleHandlers } from './listeners/lifecycleHandlers';
import { setupAlarmHandlers, createAlarms } from './listeners/alarmHandlers';
import { setupNavigationTracking } from './listeners/navigationTracking';

/** リスナー登録・メッセージハンドラ登録・定期アラーム作成をまとめて行う */
export function initBackground(): void {
  // Register all listeners
  setupSettingsWatcher();
  setupLifecycleHandlers();
  setupAlarmHandlers();
  setupNavigationTracking();

  // 画面・コンテンツスクリプトからのメッセージを受け付ける
  registerMessageHandlers();

  // Create periodic alarms
  createAlarms();
}
