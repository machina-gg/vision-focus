import * as z from 'zod';

import { IMAGE_LIMITS } from '~/constants/limits';
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

/** ブロックを弱める操作に添える、パスワード保護中の照合に使う平文のパスワード */
const UnblockPasswordSchema = z.string().optional();

/** YouTube 設定の保存を依頼する本文 */
export const UpdateYouTubeSettingsBodySchema = z.object({
  /** 保存する YouTube 設定画面の入力値 */
  youtube: YouTubeSettingsInputSchema,
  /** パスワード保護中にアクセスのブロックを外すときに照合するパスワード */
  password: UnblockPasswordSchema
});

/** YouTube 設定画面の入力値（YouTubeSettingsInputSchema を通った値） */
export type YouTubeSettingsInput = z.infer<typeof YouTubeSettingsInputSchema>;

/** YouTube 設定の保存の本文（UpdateYouTubeSettingsBodySchema を通った値） */
export type UpdateYouTubeSettingsBody = z.infer<
  typeof UpdateYouTubeSettingsBodySchema
>;

const BlockRuleSchema = z.object({
  kind: z.literal('block'),
  enabled: z.boolean(),
  addedAt: z.string(),
  timeLimit: TimeLimitSchema.nullable()
});

const AllowRuleSchema = z.object({
  kind: z.literal('allow'),
  recordTime: z.boolean()
});

const SiteRuleSchema = z.discriminatedUnion('kind', [
  BlockRuleSchema,
  AllowRuleSchema
]);

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

/** 保存する 1 項目の形（SiteEntry と対応する。設定の書き出し・取り込みの検証に使う） */
export const SiteEntrySchema = z.object({
  /** サイトキー */
  domain: z.string(),
  /** 追跡を始めた時刻（ISO8601） */
  trackedAt: z.string(),
  /** ブロックか許可の規則（null = 規則なし・追跡だけ） */
  rule: SiteRuleSchema.nullable(),
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
  /** 目標文のフォント */
  fontSettings: FontSettingsSchema
});

/** 背景画像 1 枚の値（JPEG の base64 の data URL で、文字数は IMAGE_LIMITS.TARGET_SIZE 以下） */
export const BackgroundImageDataUrlSchema = z
  .string()
  .max(IMAGE_LIMITS.TARGET_SIZE)
  .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/);

/** 設定ファイルに書くスタイルの形（画像は ID ではなく data URL で持ち、ファイル 1 つで完結させる） */
export const ExportedPresetSchema = DashboardDisplaySettingsSchema.extend({
  /** スタイルの ID */
  id: z.string(),
  /** 画面に出すスタイルの名前 */
  name: z.string(),
  /** 作成した時刻（ISO8601） */
  createdAt: z.string(),
  /** 利用者が選んだ画像。null = 使わない */
  customBackgroundData: BackgroundImageDataUrlSchema.nullable()
});

/** 設定ファイルのスタイル（ExportedPresetSchema を通った値） */
export type ExportedPreset = z.infer<typeof ExportedPresetSchema>;

const PresetIdSchema = z.string().min(1);

const TrimmedNonBlankStringSchema = z.string().trim().min(1);

/** 既定の表示設定でスタイルを作る本文（ID は background が振る） */
export const CreatePresetBodySchema = z.object({
  /** 作るスタイルの名前（前後の空白を除いて 1 文字以上。除いた値を保存する） */
  name: TrimmedNonBlankStringSchema
});

/** スタイルの作成の本文（CreatePresetBodySchema を通った値） */
export type CreatePresetBody = z.infer<typeof CreatePresetBodySchema>;

/** スタイルの画像の変え方。画面は既存の画像の ID を送れない（画像は共有しない） */
export const PresetImageInputSchema = z.discriminatedUnion('kind', [
  /** 今の画像のまま */
  z.object({ kind: z.literal('keep') }),
  /** 新しい画像にする（中身の検査は BackgroundImageDataUrlSchema で別に行う） */
  z.object({ kind: z.literal('set'), dataUrl: z.string() }),
  /** 画像を外す */
  z.object({ kind: z.literal('clear') })
]);

/** スタイルの画像の変え方（PresetImageInputSchema を通った値） */
export type PresetImageInput = z.infer<typeof PresetImageInputSchema>;

/** スタイルの名前・表示設定・画像を置き換える本文 */
export const UpdatePresetBodySchema = z.object({
  /** 置き換えるスタイルの ID */
  id: PresetIdSchema,
  /** 新しい名前（前後の空白を除いて 1 文字以上。除いた値を保存する） */
  name: TrimmedNonBlankStringSchema,
  /** 新しい表示設定（目標文と補足の文は前後の空白を除いて保存する） */
  display: DashboardDisplaySettingsSchema.extend({
    goalText: z.string().trim(),
    goalSubText: z.string().trim()
  }),
  /** 画像の変え方 */
  image: PresetImageInputSchema
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
  /** 新しい目標文（前後の空白を除いて 1 文字以上。除いた値を保存する） */
  goalText: TrimmedNonBlankStringSchema
});

/** 目標文の書き換えの本文（UpdateGoalTextBodySchema を通った値） */
export type UpdateGoalTextBody = z.infer<typeof UpdateGoalTextBodySchema>;

/** 設定ファイルの中身（data）の形。画面の取り込み前の検査と background の取り込みが同じものを使う */
export const ExportedDataSchema = z.object({
  /** 追跡中のサイト（キーはサイトキー） */
  sites: z.record(z.string(), SiteEntrySchema),
  /** ブロックが効く時間帯 */
  schedules: z.array(ScheduleSchema),
  /** ダッシュボードのスタイル（画像は data URL で含む） */
  presets: z.array(ExportedPresetSchema),
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
  paused: z.boolean(),
  /** パスワード保護中に一時停止するときに照合するパスワード */
  password: UnblockPasswordSchema
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
  enabled: z.boolean(),
  /** パスワード保護中に無効にするときに照合するパスワード */
  password: UnblockPasswordSchema
});

/** ブロックリストから項目を外す本文 */
export const RemoveBlockBodySchema = SiteBodySchema.extend({
  /** パスワード保護中に照合するパスワード */
  password: UnblockPasswordSchema
});

/** パスワードを設定する本文 */
export const SetPasswordBodySchema = z.object({
  /** 新しいパスワード（平文。強度の検査とハッシュ化は background が行う） */
  password: z.string()
});

/** パスワードの設定の本文（SetPasswordBodySchema を通った値） */
export type SetPasswordBody = z.infer<typeof SetPasswordBodySchema>;

/** パスワードを変更する本文 */
export const ChangePasswordBodySchema = z.object({
  /** 照合する今のパスワード */
  currentPassword: z.string(),
  /** 新しいパスワード（平文。強度の検査とハッシュ化は background が行う） */
  newPassword: z.string()
});

/** パスワードの変更の本文（ChangePasswordBodySchema を通った値） */
export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>;

/** パスワード保護をやめる本文 */
export const RemovePasswordBodySchema = z.object({
  /** 照合する今のパスワード */
  currentPassword: z.string()
});

/** パスワード保護の解除の本文（RemovePasswordBodySchema を通った値） */
export type RemovePasswordBody = z.infer<typeof RemovePasswordBodySchema>;
