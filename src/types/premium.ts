// 機能上限の定義
//
// かつては無料版 / 有料版で上限を分けていたが、マネタイズ方針を
// 投げ銭とアフィリエイト推薦へ変更したため、全機能を全ユーザーに開放している。
// 上限は「実装上の妥当な上限」としてのみ残している。

// Feature limits type
export interface FeatureLimits {
  maxBlockList: number;
  historyDays: number;
  maxPresets: number;
}

// Feature limits（全ユーザー共通）
export const FEATURE_LIMITS: FeatureLimits = {
  maxBlockList: Infinity,
  historyDays: Infinity,
  // スタイルは UI の見やすさの都合で上限を設けている
  maxPresets: 10
};
