/** 小文字にし先頭の `*.` と `www.` を除いたドメイン。照合範囲は declarativeNetRequest の `||キー` と一致させる */
export type SiteKey = string;

export type TimeLimitType = 'daily';

export interface TimeLimit {
  type: TimeLimitType;
  limitSeconds: number;
}

export interface TrackedSite {
  domain: SiteKey;
  /** ISO8601 */
  trackedAt: string;
  block: BlockRule | null;
  /** domain が youtube.com のときだけ値を持つ */
  youtube: YouTubeFeatures | null;
}

export interface BlockRule {
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
