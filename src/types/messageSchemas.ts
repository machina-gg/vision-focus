import * as z from 'zod';

/** 開いているページのサイトの時間制限を問い合わせる本文 */
export const GetRemainingTimeBodySchema = z.object({
  /** 開いているページの URL */
  url: z.string().min(1)
});

/** 時間制限の問い合わせの本文（GetRemainingTimeBodySchema を通った値） */
export type GetRemainingTimeBody = z.infer<typeof GetRemainingTimeBodySchema>;

/** 開いているページの表示状態の通知。滞在時間の記録に使う */
export const TrackerHeartbeatBodySchema = z.object({
  /** 表示状態が変わったページの URL */
  url: z.string().min(1).max(2048),
  /** active = 表示された / inactive = 隠れた / heartbeat = 表示中の定期通知 */
  status: z.enum(['active', 'inactive', 'heartbeat']),
  /** 送信時刻（epoch ms）。省略時は受信時刻 */
  timestamp: z.number().finite().nonnegative().optional()
});

/** 表示状態の通知の本文（TrackerHeartbeatBodySchema を通った値） */
export type TrackerHeartbeatBody = z.infer<typeof TrackerHeartbeatBodySchema>;

const TimeLimitSchema = z.object({
  type: z.literal('daily'),
  limitSeconds: z.number().positive()
});

/** ブロックリストの項目の時間制限を変える本文 */
export const UpdateTimeLimitBodySchema = z.object({
  /** 変える項目のドメイン */
  domain: z.string().min(1),
  /** 新しい時間制限。null = 常時ブロック */
  timeLimit: TimeLimitSchema.nullable()
});

/** 時間制限の変更の本文（UpdateTimeLimitBodySchema を通った値） */
export type UpdateTimeLimitBody = z.infer<typeof UpdateTimeLimitBodySchema>;

/** YouTube 設定画面の入力値（youtube.com のブロックと非表示機能をまとめて保存する） */
export const YouTubeSettingsInputSchema = z.object({
  /** false = 非表示機能もブロックも使わない（他の項目は無視される） */
  enabled: z.boolean(),
  /** youtube.com そのものをブロックするか */
  blockAccess: z.boolean(),
  /** Shorts（棚・タブ・検索結果）を非表示にするか */
  hideShorts: z.boolean(),
  /** おすすめ・関連動画と自動再生を非表示にするか */
  hideRecommendations: z.boolean(),
  /** コメント欄とライブチャットを非表示にするか */
  hideComments: z.boolean(),
  /** ホームのフィードを非表示にするか */
  hideHomeFeed: z.boolean(),
  /** youtube.com をブロックするときの時間制限。null = 常時ブロック */
  timeLimit: TimeLimitSchema.nullable()
});

/** YouTube 設定の保存を依頼する本文 */
export const UpdateYouTubeSettingsBodySchema = z.object({
  /** 保存する YouTube 設定画面の入力値 */
  youtube: YouTubeSettingsInputSchema
});

/** YouTube 設定画面の入力値（YouTubeSettingsInputSchema を通った値） */
export type YouTubeSettingsInput = z.infer<typeof YouTubeSettingsInputSchema>;

/** YouTube 設定の保存の本文（UpdateYouTubeSettingsBodySchema を通った値） */
export type UpdateYouTubeSettingsBody = z.infer<
  typeof UpdateYouTubeSettingsBodySchema
>;

const BlockRuleSchema = z.object({
  enabled: z.boolean(),
  addedAt: z.string(),
  timeLimit: TimeLimitSchema.nullable()
});

/** YouTube の非表示機能の保存値の形（YouTubeFeatures と対応する） */
export const YouTubeFeaturesSchema = z.object({
  /** Shorts（棚・タブ・検索結果）を非表示にするか */
  hideShorts: z.boolean(),
  /** おすすめ・関連動画と自動再生を非表示にするか */
  hideRecommendations: z.boolean(),
  /** コメント欄とライブチャットを非表示にするか */
  hideComments: z.boolean(),
  /** ホームのフィードを非表示にするか */
  hideHomeFeed: z.boolean()
});

/** 追跡中のサイトの保存値の形（TrackedSite と対応する。設定の書き出し・取り込みの検証に使う） */
export const TrackedSiteSchema = z.object({
  /** サイトキー */
  domain: z.string(),
  /** 追跡を始めた時刻（ISO8601） */
  trackedAt: z.string(),
  /** null = ブロック対象ではない（追跡だけ） */
  block: BlockRuleSchema.nullable(),
  /** YouTube の非表示機能。null = 使わない */
  youtube: YouTubeFeaturesSchema.nullable()
});

const ScheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  days: z.array(z.number()),
  enabled: z.boolean(),
  presetId: z.string().optional()
});

const NotificationSettingsSchema = z.object({
  timeLimitEnabled: z.boolean(),
  // z.union([z.literal(1), ...]) だと推論でキーが省略可能になるため、z.literal に配列で渡す
  timeLimitMinutes: z.literal([1, 3, 5, 10])
});

/** 設定の取り込みの本文。未知のキーを落とすと AppSettings に項目が増えたとき保存から抜け落ちるため、settings は looseObject にする */
export const ImportSettingsBodySchema = z.object({
  /** 取り込むアプリ設定 */
  settings: z.looseObject({
    /** 取り込むスケジュール */
    schedules: z.array(ScheduleSchema),
    /** true = すべてのブロックを一時停止中 */
    paused: z.boolean(),
    /** 取り込む通知設定 */
    notifications: NotificationSettingsSchema
  }),
  /** 取り込む追跡中のサイト */
  sites: z.array(TrackedSiteSchema)
});

/** 設定の取り込みの本文（ImportSettingsBodySchema を通った値） */
export type ImportSettingsBody = z.infer<typeof ImportSettingsBodySchema>;

/** domain だけを持つメッセージ本文（ドメイン名の長さの上限 253 文字まで） */
export const SiteBodySchema = z.object({
  /** 対象のサイトのドメイン */
  domain: z.string().min(1).max(253)
});

/** ブロックリストの項目の有効・無効を切り替える本文 */
export const ToggleBlockBodySchema = SiteBodySchema.extend({
  /** true = ブロックを有効にする / false = 一時的に無効にする */
  enabled: z.boolean()
});
