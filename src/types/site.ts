// 追跡中のサイトとサイトごとの設定の型

/**
 * 追跡中のサイトを一意に表すキー。
 * 小文字にし、先頭の `*.` と `www.` を除いたドメイン（例: `youtube.com`）。
 * 照合は「ホスト名がキーと一致するか `.キー` で終わるか」で、
 * declarativeNetRequest の `||キー` と同じ範囲になる
 */
export type SiteKey = string;

// 時間制限は「1 日の制限」のみ（型として残すのは、制限の種類が増えたときに
// 追加する場所を 1 箇所に保つため）
export type TimeLimitType = 'daily';

export interface TimeLimit {
  type: TimeLimitType;
  limitSeconds: number; // Limit in seconds (e.g., 1800 = 30 minutes)
}

/** 追跡中のサイト。分析の母集団であり、サイトごとの設定の置き場でもある */
export interface TrackedSite {
  domain: SiteKey;
  /** 追跡を始めた時刻（ISO8601） */
  trackedAt: string;
  /** null = ブロック対象ではない（追跡だけ） */
  block: BlockRule | null;
  /** YouTube 固有の非表示機能。domain が youtube.com のときだけ値を持てる。null = 使わない */
  youtube: YouTubeFeatures | null;
}

export interface BlockRule {
  /** ブロックリストのトグル。false = 一時的に無効 */
  enabled: boolean;
  /** ブロックリストに入れた時刻（ISO8601）。ブロック日数の起点 */
  addedAt: string;
  /** null = 常時ブロック */
  timeLimit: TimeLimit | null;
}

export interface YouTubeFeatures {
  hideShorts: boolean;
  hideRecommendations: boolean;
  hideComments: boolean;
  hideHomeFeed: boolean;
}

export type TrackedSites = Record<SiteKey, TrackedSite>;
