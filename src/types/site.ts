/** 小文字にし先頭の `*.` と `www.` を除いたドメイン。照合範囲は declarativeNetRequest の `||キー` と一致させる */
export type SiteKey = string;

export type TimeLimitType = 'daily';

/** 1 日あたりの利用時間の上限。超えるとその日はブロックされる */
export interface TimeLimit {
  type: TimeLimitType;
  limitSeconds: number;
}

/** 追跡中のサイト。分析の母集団であり、サイトごとの設定の置き場でもある */
export interface TrackedSite {
  domain: SiteKey;
  /** 追跡を始めた時刻（ISO8601） */
  trackedAt: string;
  /** null = ブロック対象ではない（追跡だけ） */
  block: BlockRule | null;
  /** YouTube の非表示機能。domain が youtube.com のときだけ値を持つ。null = 使わない */
  youtube: YouTubeFeatures | null;
}

export interface BlockRule {
  /** false = ブロックリストで一時的に無効 */
  enabled: boolean;
  /** ISO8601。ブロック日数の起点 */
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
