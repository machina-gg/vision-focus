/** 小文字にし先頭の `*.` と `www.` を除いたドメイン。照合範囲は declarativeNetRequest の `requestDomains: [キー]` と一致させる */
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

/** 追跡の情報。分析の母集団を決め、ブロック・許可の設定は持たない */
export interface TrackedSite {
  /** このサイトのサイトキー（TrackedSites のキーと同じ） */
  domain: SiteKey;
  /** 追跡を始めた時刻（ISO8601） */
  trackedAt: string;
}

/** サイトのブロックの設定 */
export interface BlockRule {
  /** 規則の種類（ブロック） */
  kind: 'block';
  /** false = ブロックリストで一時的に無効 */
  enabled: boolean;
  /** ISO8601。ブロック日数の起点 */
  addedAt: string;
  /** null = 常時ブロック */
  timeLimit: TimeLimit | null;
}

/** 許可サイトの設定。覆うブロックがあってもこのサイトとその下のホストは開ける */
export interface AllowRule {
  /** 規則の種類（許可） */
  kind: 'allow';
  /** false の間は滞在時間を記録しない */
  recordTime: boolean;
}

/** サイトの規則（ブロックか許可） */
export type SiteRule = BlockRule | AllowRule;

/** 保存する 1 項目（追跡の情報とサイトごとの設定） */
export interface SiteEntry extends TrackedSite {
  /** null = 規則なし（追跡だけ） */
  rule: SiteRule | null;
  /** YouTube の非表示機能。domain が youtube.com のときだけ値を持つ。null = 使わない */
  youtube: YouTubeFeatures | null;
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

/** サイトキー → 保存する項目（保存値 sites の形） */
export type TrackedSites = Record<SiteKey, SiteEntry>;
