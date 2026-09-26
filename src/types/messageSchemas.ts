import * as z from 'zod';

export const GetRemainingTimeBodySchema = z.object({
  url: z.string().min(1)
});

export type GetRemainingTimeBody = z.infer<typeof GetRemainingTimeBodySchema>;

/** 開いているページの表示状態の通知。滞在時間の記録に使う */
export const TrackerHeartbeatBodySchema = z.object({
  url: z.string().min(1).max(2048),
  /** active = 表示された / inactive = 隠れた / heartbeat = 表示中の定期通知 */
  status: z.enum(['active', 'inactive', 'heartbeat']),
  /** 送信時刻（epoch ms）。省略時は受信時刻 */
  timestamp: z.number().finite().nonnegative().optional()
});

export type TrackerHeartbeatBody = z.infer<typeof TrackerHeartbeatBodySchema>;

const TimeLimitSchema = z.object({
  type: z.literal('daily'),
  limitSeconds: z.number().positive()
});

export const UpdateTimeLimitBodySchema = z.object({
  domain: z.string().min(1),
  timeLimit: TimeLimitSchema.nullable()
});

export type UpdateTimeLimitBody = z.infer<typeof UpdateTimeLimitBodySchema>;

/** YouTube 設定画面の入力値（youtube.com のブロックと非表示機能をまとめて保存する） */
export const YouTubeSettingsInputSchema = z.object({
  /** false = 非表示機能もブロックも使わない（他の項目は無視される） */
  enabled: z.boolean(),
  /** youtube.com そのものをブロックするか */
  blockAccess: z.boolean(),
  hideShorts: z.boolean(),
  hideRecommendations: z.boolean(),
  hideComments: z.boolean(),
  hideHomeFeed: z.boolean(),
  timeLimit: TimeLimitSchema.nullable()
});

export const UpdateYouTubeSettingsBodySchema = z.object({
  youtube: YouTubeSettingsInputSchema
});

export type YouTubeSettingsInput = z.infer<typeof YouTubeSettingsInputSchema>;

export type UpdateYouTubeSettingsBody = z.infer<
  typeof UpdateYouTubeSettingsBodySchema
>;

export const BlockRuleSchema = z.object({
  enabled: z.boolean(),
  addedAt: z.string(),
  timeLimit: TimeLimitSchema.nullable()
});

export const YouTubeFeaturesSchema = z.object({
  hideShorts: z.boolean(),
  hideRecommendations: z.boolean(),
  hideComments: z.boolean(),
  hideHomeFeed: z.boolean()
});

export const TrackedSiteSchema = z.object({
  domain: z.string(),
  trackedAt: z.string(),
  block: BlockRuleSchema.nullable(),
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
  settings: z.looseObject({
    schedules: z.array(ScheduleSchema),
    paused: z.boolean(),
    notifications: NotificationSettingsSchema
  }),
  sites: z.array(TrackedSiteSchema)
});

export type ImportSettingsBody = z.infer<typeof ImportSettingsBodySchema>;

/** domain だけを持つメッセージ本文（ドメイン名の長さの上限 253 文字まで） */
export const SiteBodySchema = z.object({
  domain: z.string().min(1).max(253)
});

export const ToggleBlockBodySchema = SiteBodySchema.extend({
  enabled: z.boolean()
});
