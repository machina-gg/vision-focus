/** 小文字にし先頭の `*.` と `www.` を除いたドメイン。照合範囲は declarativeNetRequest の `||キー` と一致させる */
export type SiteKey = string;

/** 時間制限の種類。daily = 1 日ごとに使用量を数え直す */
export type TimeLimitType = 'daily';

/** 1 日あたりの利用時間の上限。超えるとその日はブロックされる */
export interface TimeLimit {
  /** 時間制限の種類 */
  type: TimeLimitType;
  /** 1 日に使える秒数（正の数） */
  limitSeconds: number;
}

/** 追跡中のサイト。分析の母集団であり、サイトごとの設定の置き場でもある */
export interface TrackedSite {
  /** このサイトのサイトキー（TrackedSites のキーと同じ） */
  domain: SiteKey;
  /** 追跡を始めた時刻（ISO8601） */
  trackedAt: string;
  /** null = ブロック対象ではない（追跡だけ） */
  block: BlockRule | null;
  /** YouTube の非表示機能。domain が youtube.com のときだけ値を持つ。null = 使わない */
  youtube: YouTubeFeatures | null;
}

/** サイトのブロックの設定 */
export interface BlockRule {
  /** false = ブロックリストで一時的に無効 */
  enabled: boolean;
  /** ISO8601。ブロック日数の起点 */
  addedAt: string;
  /** null = 常時ブロック */
  timeLimit: TimeLimit | null;
}

/** YouTube の非表示機能ごとのオン・オフ */
export interface YouTubeFeatures {
  /** Shorts（棚・タブ・検索結果）を非表示にするか */
  hideShorts: boolean;
  /** おすすめ・関連動画と自動再生を非表示にするか */
  hideRecommendations: boolean;
  /** コメント欄とライブチャットを非表示にするか */
  hideComments: boolean;
  /** ホームのフィードを非表示にするか */
  hideHomeFeed: boolean;
}

/** サイトキー → 追跡中のサイト（保存値 sites の形） */
export type TrackedSites = Record<SiteKey, TrackedSite>;
