import * as z from 'zod';

import { END_OF_DAY_TIME, TIME_OF_DAY_PATTERN } from '~/lib/time';
import { FONT_FAMILIES } from '~/types/font';
import { UNBLOCK_HOLD_SECONDS_OPTIONS } from '~/types/storage';

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

/** スケジュールの開始時刻（"HH:MM"。"24:00" は拒む） */
export const ScheduleStartTimeSchema = z.string().regex(TIME_OF_DAY_PATTERN);

/** スケジュールの終了時刻（"HH:MM" か、その日の終わりの "24:00"） */
export const ScheduleEndTimeSchema = z.union([
  ScheduleStartTimeSchema,
  z.literal(END_OF_DAY_TIME)
]);

/** スケジュールの保存値の形（Schedule と対応する。設定の取り込みと、画面からの追加・更新の検証に使う） */
export const ScheduleSchema = z.object({
  id: z.string(),
  /** 空白以外を 1 文字以上含む */
  name: z.string().regex(/\S/),
  startTime: ScheduleStartTimeSchema,
  endTime: ScheduleEndTimeSchema,
  /** 0（日曜）〜 6（土曜）を重複なく 1 つ以上 */
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .refine((days) => new Set(days).size === days.length),
  enabled: z.boolean(),
  presetId: z.string().optional()
});

/** 画面が送るスケジュールの入力値（ScheduleSchema から background が決める id / enabled を除いたもの） */
export const ScheduleInputSchema = ScheduleSchema.omit({
  id: true,
  enabled: true
});

/** スケジュールの入力値（ScheduleInputSchema を通った値） */
export type ScheduleInput = z.infer<typeof ScheduleInputSchema>;

const ScheduleIdSchema = z.string().min(1);

/** スケジュールを足す本文 */
export const AddScheduleBodySchema = z.object({
  /** 足すスケジュールの入力値 */
  schedule: ScheduleInputSchema
});

/** スケジュールの追加の本文（AddScheduleBodySchema を通った値） */
export type AddScheduleBody = z.infer<typeof AddScheduleBodySchema>;

/** スケジュールの入力値を置き換える本文 */
export const UpdateScheduleBodySchema = z.object({
  /** 置き換えるスケジュールの ID */
  id: ScheduleIdSchema,
  /** 新しい入力値 */
  schedule: ScheduleInputSchema
});

/** スケジュールの更新の本文（UpdateScheduleBodySchema を通った値） */
export type UpdateScheduleBody = z.infer<typeof UpdateScheduleBodySchema>;

/** スケジュールを消す本文 */
export const RemoveScheduleBodySchema = z.object({
  /** 消すスケジュールの ID */
  id: ScheduleIdSchema
});

/** スケジュールの削除の本文（RemoveScheduleBodySchema を通った値） */
export type RemoveScheduleBody = z.infer<typeof RemoveScheduleBodySchema>;

/** スケジュールの有効・無効を切り替える本文 */
export const ToggleScheduleBodySchema = z.object({
  /** 切り替えるスケジュールの ID */
  id: ScheduleIdSchema,
  /** true = 有効にする / false = 無効にする */
  enabled: z.boolean()
});

/** スケジュールの有効・無効の切り替えの本文（ToggleScheduleBodySchema を通った値） */
export type ToggleScheduleBody = z.infer<typeof ToggleScheduleBodySchema>;

/** 残り時間の通知の設定の形（NotificationSettings と対応する） */
export const NotificationSettingsSchema = z.object({
  /** 残り時間の通知を出すか */
  timeLimitEnabled: z.boolean(),
  // z.union([z.literal(1), ...]) だと推論でキーが省略可能になるため、z.literal に配列で渡す
  /** 残り時間がこの分数以下になったら通知する */
  timeLimitMinutes: z.literal([1, 3, 5, 10])
});

/** 長押し確認の設定の形（UnblockConfirmSettings と対応する） */
export const UnblockConfirmSettingsSchema = z.object({
  /** 押し続ける秒数（UNBLOCK_HOLD_SECONDS_OPTIONS のどれか） */
  holdSeconds: z.literal(UNBLOCK_HOLD_SECONDS_OPTIONS)
});

/** 残り時間の通知の設定を保存する本文 */
export const UpdateNotificationsBodySchema = z.object({
  /** 新しい通知の設定 */
  notifications: NotificationSettingsSchema
});

/** 通知の設定の保存の本文（UpdateNotificationsBodySchema を通った値） */
export type UpdateNotificationsBody = z.infer<
  typeof UpdateNotificationsBodySchema
>;

/** 長押し確認の設定を保存する本文 */
export const UpdateUnblockConfirmBodySchema = z.object({
  /** 新しい長押し確認の設定 */
  unblockConfirm: UnblockConfirmSettingsSchema
});

/** 長押し確認の設定の保存の本文（UpdateUnblockConfirmBodySchema を通った値） */
export type UpdateUnblockConfirmBody = z.infer<
  typeof UpdateUnblockConfirmBodySchema
>;

/** 利用状況の送信への同意・拒否を保存する本文（選んだ時刻は background が決める） */
export const UpdateAnalyticsOptInBodySchema = z.object({
  /** true = 同意する / false = 拒否する */
  enabled: z.boolean()
});

/** 同意・拒否の保存の本文（UpdateAnalyticsOptInBodySchema を通った値） */
export type UpdateAnalyticsOptInBody = z.infer<
  typeof UpdateAnalyticsOptInBodySchema
>;

/** 目標文のフォントの形（FontSettings と対応する） */
export const FontSettingsSchema = z.object({
  /** 使うフォント（FONT_FAMILIES のどれか） */
  family: z.enum(FONT_FAMILIES),
  /** 文字サイズの段階 */
  size: z.enum(['sm', 'md', 'lg', 'xl']),
  /** 文字の太さの段階 */
  weight: z.enum(['normal', 'medium', 'semibold', 'bold'])
});

/** 表示設定の形（DashboardDisplaySettings と対応する。設定の取り込みとスタイルの更新の検証に使う） */
export const DashboardDisplaySettingsSchema = z.object({
  /** 大きく出す目標文 */
  goalText: z.string(),
  /** 目標文の下に出す補足の文 */
  goalSubText: z.string(),
  /** CSS の色の値 */
  textColor: z.string(),
  /** image = 背景画像を使う / color = 単色の背景を使う */
  backgroundType: z.enum(['image', 'color']),
  /** 同梱の背景画像の ID */
  backgroundImage: z.string(),
  /** backgroundType が color のときの CSS の色の値 */
  backgroundColor: z.string(),
  /** 利用者が選んだ画像の data URL。null = 使わない */
  customBackgroundData: z.string().nullable(),
  /** 目標文のフォント */
  fontSettings: FontSettingsSchema
});

/** スタイルの保存値の形（DashboardPreset と対応する。設定の取り込みの検証に使う） */
export const DashboardPresetSchema = DashboardDisplaySettingsSchema.extend({
  /** スタイルの ID */
  id: z.string(),
  /** 画面に出すスタイルの名前 */
  name: z.string(),
  /** 作成した時刻（ISO8601） */
  createdAt: z.string()
});

const PresetIdSchema = z.string().min(1);

const NonBlankStringSchema = z.string().regex(/\S/);

/** 既定の表示設定でスタイルを作る本文（ID は background が振る） */
export const CreatePresetBodySchema = z.object({
  /** 作るスタイルの名前（空白以外を 1 文字以上含む） */
  name: NonBlankStringSchema
});

/** スタイルの作成の本文（CreatePresetBodySchema を通った値） */
export type CreatePresetBody = z.infer<typeof CreatePresetBodySchema>;

/** スタイルの名前と表示設定を置き換える本文 */
export const UpdatePresetBodySchema = z.object({
  /** 置き換えるスタイルの ID */
  id: PresetIdSchema,
  /** 新しい名前（空白以外を 1 文字以上含む） */
  name: NonBlankStringSchema,
  /** 新しい表示設定（画像は data URL のまま含む） */
  display: DashboardDisplaySettingsSchema
});

/** スタイルの更新の本文（UpdatePresetBodySchema を通った値） */
export type UpdatePresetBody = z.infer<typeof UpdatePresetBodySchema>;

/** スタイル 1 つを ID で指す本文（適用・削除で共通） */
export const PresetIdBodySchema = z.object({
  /** 対象のスタイルの ID */
  id: PresetIdSchema
});

/** スタイルを ID で指す本文（PresetIdBodySchema を通った値） */
export type PresetIdBody = z.infer<typeof PresetIdBodySchema>;

/** 既定の表示設定の目標文を書き換える本文 */
export const UpdateGoalTextBodySchema = z.object({
  /** 新しい目標文（空白以外を 1 文字以上含む） */
  goalText: NonBlankStringSchema
});

/** 目標文の書き換えの本文（UpdateGoalTextBodySchema を通った値） */
export type UpdateGoalTextBody = z.infer<typeof UpdateGoalTextBodySchema>;

/** 設定ファイルの中身（data）の形。画面の取り込み前の検査と background の取り込みが同じものを使う */
export const ExportedDataSchema = z.object({
  /** 追跡中のサイト（キーはサイトキー） */
  sites: z.record(z.string(), TrackedSiteSchema),
  /** ブロックが効く時間帯 */
  schedules: z.array(ScheduleSchema),
  /** ダッシュボードのスタイル */
  presets: z.array(DashboardPresetSchema),
  /** スタイルを適用していないときの表示設定 */
  defaultDisplaySettings: DashboardDisplaySettingsSchema,
  /** 適用中のスタイルの ID（null = defaultDisplaySettings を使う） */
  activePresetId: z.string().nullable(),
  /** 残り時間の通知の設定 */
  notifications: NotificationSettingsSchema,
  /** 長押し確認の設定 */
  unblockConfirm: UnblockConfirmSettingsSchema
});

/** 設定ファイルの中身（ExportedDataSchema を通った値） */
export type ExportedData = z.infer<typeof ExportedDataSchema>;

/** 設定の取り込みの本文 */
export const ImportSettingsBodySchema = z.object({
  /** 取り込む設定ファイルの中身 */
  data: ExportedDataSchema
});

/** 設定の取り込みの本文（ImportSettingsBodySchema を通った値） */
export type ImportSettingsBody = z.infer<typeof ImportSettingsBodySchema>;

/** すべてのブロックの一時停止を切り替える本文 */
export const TogglePauseBodySchema = z.object({
  /** true = 一時停止する / false = 再開する */
  paused: z.boolean()
});

/** 一時停止の切り替えの本文（TogglePauseBodySchema を通った値） */
export type TogglePauseBody = z.infer<typeof TogglePauseBodySchema>;

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
