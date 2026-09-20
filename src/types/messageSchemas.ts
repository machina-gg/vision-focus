/**
 * Zod schemas for validating message handler request bodies.
 * Replaces unsafe `as` type assertions with runtime validation.
 *
 * Types are automatically inferred from schemas using `z.infer<typeof Schema>`.
 * This ensures type safety and eliminates duplication between schemas and types.
 */

import * as z from 'zod';

// Schema for get-remaining-time message handler
export const GetRemainingTimeBodySchema = z.object({
  url: z.string().min(1)
});

export type GetRemainingTimeBody = z.infer<typeof GetRemainingTimeBodySchema>;

// Schema for tracker-heartbeat message handler
export const TrackerHeartbeatBodySchema = z.object({
  url: z.string().min(1).max(2048),
  status: z.enum(['active', 'inactive', 'heartbeat']),
  timestamp: z.number().finite().nonnegative().optional()
});

export type TrackerHeartbeatBody = z.infer<typeof TrackerHeartbeatBodySchema>;

// Schema for update-time-limit message handler
const TimeLimitSchema = z.object({
  type: z.literal('daily'),
  limitSeconds: z.number().positive()
});

export const UpdateTimeLimitBodySchema = z.object({
  id: z.string().min(1),
  timeLimit: TimeLimitSchema.nullable()
});

export type UpdateTimeLimitBody = z.infer<typeof UpdateTimeLimitBodySchema>;

// Schema for AnalyticsData validation (used in youtube.ts content script)
const TimeLimitUsageSchema = z.object({
  domain: z.string(),
  dailyUsedSeconds: z.number(),
  lastDailyReset: z.string()
});

const DailyStatSchema = z.object({
  date: z.string(),
  wasteTime: z.number(),
  investTime: z.number(),
  blockCount: z.number()
});

const SiteTimeSchema = z.object({
  domain: z.string(),
  time: z.number(),
  category: z.enum(['waste', 'invest', 'neutral']),
  lastUpdated: z.string()
});

const SiteBlockCountSchema = z.object({
  domain: z.string(),
  count: z.number(),
  lastBlocked: z.string()
});

export const AnalyticsDataSchema = z.object({
  dailyStats: z.record(z.string(), DailyStatSchema),
  siteTime: z.record(z.string(), SiteTimeSchema),
  siteCategories: z.record(z.string(), z.enum(['waste', 'invest', 'neutral'])),
  siteBlockCounts: z.record(z.string(), SiteBlockCountSchema),
  timeLimitUsage: z.record(z.string(), TimeLimitUsageSchema)
});

// Schema for YouTubeSettings validation (used in youtube.ts content script)
// 非 strict な z.object なので、廃止したキーが保存済みデータに残っていても
// parse は落ちずに無視される。そのため設定削除時の移行処理は持たない（#393）
export const YouTubeSettingsSchema = z.object({
  enabled: z.boolean(),
  blockAccess: z.boolean().optional().default(false),
  hideShorts: z.boolean(),
  hideRecommendations: z.boolean(),
  hideComments: z.boolean(),
  hideHomeFeed: z.boolean(),
  timeLimit: TimeLimitSchema.nullable().optional()
});

// Schema for update-youtube-settings message handler
// YouTube 設定は background 経由で保存する（保存と同時に既存タブのブロックを行うため）
export const UpdateYouTubeSettingsBodySchema = z.object({
  youtube: YouTubeSettingsSchema
});

export type UpdateYouTubeSettingsBody = z.infer<
  typeof UpdateYouTubeSettingsBodySchema
>;

// Schemas for import-settings message handler
// 設定のインポートは background 経由で保存する（保存と同時に既存タブのブロックを行うため）

// 保存済みデータには enabled を持たない項目が残りうるため、欠けていれば有効として扱う
// （設定ファイル側の検証（settingsExport.ts）と同じ既定値）
const BlockItemSchema = z.object({
  id: z.string(),
  domain: z.string(),
  isWildcard: z.boolean(),
  createdAt: z.string(),
  enabled: z.boolean().optional().default(true),
  timeLimit: TimeLimitSchema.nullable().optional()
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
  // ⚠ z.union([z.literal(1), ...]) と書くと推論結果でキーが省略可能になるため、
  //    値の列挙は z.literal に配列で渡す
  timeLimitMinutes: z.literal([1, 3, 5, 10])
});

// 画面側が applyImportedSettings で組み立てた「適用後の設定」を受け取る。
// ⚠ 未知のキーを残す z.looseObject を使う（AppSettings に項目が増えたとき、
//    検証の取りこぼしで保存から抜け落ちないようにするため）。
// 検証するのはブロック判定に使う項目で、古い保存データで欠けていても受け付ける
export const ImportSettingsBodySchema = z.object({
  settings: z.looseObject({
    blockList: z.array(BlockItemSchema),
    schedules: z.array(ScheduleSchema),
    paused: z.boolean().optional(),
    notifications: NotificationSettingsSchema.optional(),
    youtube: YouTubeSettingsSchema.optional()
  })
});

export type ImportSettingsBody = z.infer<typeof ImportSettingsBodySchema>;
