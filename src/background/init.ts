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
import { startTracking } from './tracker';

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

  // 滞在時間の計測を開始する。
  // ⚠ ここで呼ぶ必要がある。エントリ（src/entrypoints/background.ts）は
  // service worker の起動のたびに評価されるので、アイドル停止から起こされた
  // 直後にも計測が再開する。onInstalled / onStartup だけだと、最初の停止以降
  // ブラウザを再起動するまで計測が動かない（#440）。
  // startTracking() は重ねて呼ばれてもタイマー・リスナーが増えない
  startTracking();
}
