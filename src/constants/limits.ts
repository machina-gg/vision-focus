/** 背景に使う画像のアップロードの上限と圧縮の目標 */
export const IMAGE_LIMITS = {
  /** 受け付けるファイルの最大サイズ（バイト） */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  /** 圧縮後の目標サイズ（バイト） */
  TARGET_SIZE: 1 * 1024 * 1024,
  /** 縮小後の最大の幅（px） */
  MAX_WIDTH: 1920,
  /** 縮小後の最大の高さ（px） */
  MAX_HEIGHT: 1080,
  /** 受け付ける MIME タイプ */
  SUPPORTED_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const
} as const;

/** declarativeNetRequest のブロックのルールの設定 */
export const BLOCKER_CONFIG = {
  /** 動的ルールの id の開始値（ブロック対象の並び順を足して id にする） */
  RULE_ID_OFFSET: 1000
} as const;

/** 滞在時間の記録の設定 */
export const TRACKER_CONFIG = {
  /** 表示中のサイトの滞在時間を記録する間隔（ms。1 回の記録で足す秒数もこれから出す） */
  RECORDING_INTERVAL_MS: 5 * 1000,
  /** 最後のハートビートからこの時間を過ぎたページは表示中とみなさない（ms） */
  HEARTBEAT_TIMEOUT_MS: 10 * 1000
} as const;

/** 時間制限の設定 */
export const TIME_LIMIT_CONFIG = {
  /** 1 日の制限時間の既定値（秒） */
  DEFAULT_DAILY_LIMIT: 30 * 60,
  /** 残り時間の割合がこれ以下になったら警告の表示にする（0〜1） */
  WARNING_THRESHOLD: 0.2,
  /** 1 日の制限時間の選択肢（分。昇順） */
  DAILY_PRESET_MINUTES: [5, 15, 30, 60] as const
} as const;

/**
 * 分数に最も近い 1 日の制限時間の選択肢を返す（等距離なら小さい方）
 * @param minutes 制限時間（分）
 * @returns DAILY_PRESET_MINUTES のいずれか（分）
 */
export function roundToNearestPreset(minutes: number): number {
  const presets = TIME_LIMIT_CONFIG.DAILY_PRESET_MINUTES;

  return presets.reduce((nearest, preset) => {
    return Math.abs(preset - minutes) < Math.abs(nearest - minutes)
      ? preset
      : nearest;
  }, presets[0]);
}

/**
 * スタイルのプリセットを作れる数の上限
 * 選択ボタンを横並びで表示する UI の都合による上限
 */
export const MAX_PRESETS = 10;
