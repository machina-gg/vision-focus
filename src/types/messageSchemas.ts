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
  domain: z.string().min(1),
  timeLimit: TimeLimitSchema.nullable()
});

export type UpdateTimeLimitBody = z.infer<typeof UpdateTimeLimitBodySchema>;

// YouTube の節が送る値（機能全体の有効・非表示機能・アクセスブロックをまとめた形）。
// 保存形は youtube.com の追跡中のサイトで、変換は update-youtube-settings ハンドラが行う
export const YouTubeSettingsInputSchema = z.object({
  enabled: z.boolean(),
  blockAccess: z.boolean(),
  hideShorts: z.boolean(),
  hideRecommendations: z.boolean(),
  hideComments: z.boolean(),
  hideHomeFeed: z.boolean(),
  timeLimit: TimeLimitSchema.nullable()
});

// Schema for update-youtube-settings message handler
// YouTube 設定は background 経由で保存する（保存と同時に既存タブのブロックを行うため）
export const UpdateYouTubeSettingsBodySchema = z.object({
  youtube: YouTubeSettingsInputSchema
});

export type YouTubeSettingsInput = z.infer<typeof YouTubeSettingsInputSchema>;

export type UpdateYouTubeSettingsBody = z.infer<
  typeof UpdateYouTubeSettingsBodySchema
>;

// 追跡中のサイトの保存形（設定ファイルの取り込みとインポートのメッセージで検証に使う）
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

// Schemas for import-settings message handler
// 設定のインポートは background 経由で保存する（保存と同時に既存タブのブロックを行うため）

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

// 画面側が applyImportedSettings で組み立てた「適用後の設定」と、取り込む追跡中のサイトを受け取る。
// ⚠ 設定は未知のキーを残す z.looseObject を使う（AppSettings に項目が増えたとき、
//    検証の取りこぼしで保存から抜け落ちないようにするため）。
// 追跡中のサイトは既存とのマージ（入れ子の拒否を含む）を background が行う
export const ImportSettingsBodySchema = z.object({
  settings: z.looseObject({
    schedules: z.array(ScheduleSchema),
    paused: z.boolean(),
    notifications: NotificationSettingsSchema
  }),
  sites: z.array(TrackedSiteSchema)
});

export type ImportSettingsBody = z.infer<typeof ImportSettingsBodySchema>;

// サイトキー 1 つを宛先にするメッセージ（remove-block / stop-tracking）
export const SiteBodySchema = z.object({
  domain: z.string().min(1).max(253)
});

export const ToggleBlockBodySchema = SiteBodySchema.extend({
  enabled: z.boolean()
});
