import {
  defineExtensionMessaging,
  type ExtensionMessage,
  type GetReturnType,
  type MaybePromise,
  type Message
} from '@webext-core/messaging';

import type {
  AddBlockRequest,
  AddBlockResponse,
  AddScheduleRequest,
  AddTrackedSiteRequest,
  ApplyPresetRequest,
  CreatePresetRequest,
  CreatePresetResponse,
  DeletePresetRequest,
  AddTrackedSiteResponse,
  GetRemainingTimeRequest,
  GetRemainingTimeResponse,
  ImportSettingsRequest,
  ImportSettingsResponse,
  RemoveBlockRequest,
  RemoveBlockResponse,
  RemoveScheduleRequest,
  ResetActivityResponse,
  SettingsChangeResponse,
  StopTrackingRequest,
  StopTrackingResponse,
  ToggleBlockRequest,
  ToggleBlockResponse,
  ToggleScheduleRequest,
  TogglePauseRequest,
  TogglePauseResponse,
  TrackerHeartbeatRequest,
  TrackerHeartbeatResponse,
  UpdateAnalyticsOptInRequest,
  UpdateGoalTextRequest,
  UpdateNotificationsRequest,
  UpdatePresetRequest,
  UpdateScheduleRequest,
  UpdateTimeLimitRequest,
  UpdateTimeLimitResponse,
  UpdateUnblockConfirmRequest,
  UpdateYouTubeSettingsRequest,
  UpdateYouTubeSettingsResponse
} from '~/types/messages';

/** メッセージ名ごとの引数と戻り値。送信側と受信側の型をここで縛る */
export interface ProtocolMap {
  /** サイトをブロックリストに追加する */
  'add-block'(data: AddBlockRequest): AddBlockResponse;
  /** スケジュールを足す */
  'add-schedule'(data: AddScheduleRequest): SettingsChangeResponse;
  /** サイトの追跡だけを始める */
  'add-tracked-site'(data: AddTrackedSiteRequest): AddTrackedSiteResponse;
  /** スタイルを適用中にする */
  'apply-preset'(data: ApplyPresetRequest): SettingsChangeResponse;
  /** 既定の表示設定でスタイルを作る（上限まで） */
  'create-preset'(data: CreatePresetRequest): CreatePresetResponse;
  /** スタイルを消し、適用中の指定とスケジュールからの参照も外す */
  'delete-preset'(data: DeletePresetRequest): SettingsChangeResponse;
  /** 開いているページのサイトの時間制限と今日の残り秒数を返す */
  'get-remaining-time'(data: GetRemainingTimeRequest): GetRemainingTimeResponse;
  /** 設定ファイルの設定・表示設定と追跡中のサイトを取り込む */
  'import-settings'(data: ImportSettingsRequest): ImportSettingsResponse;
  /** サイトのブロック設定を外す（追跡は続く） */
  'remove-block'(data: RemoveBlockRequest): RemoveBlockResponse;
  /** スケジュールを消す */
  'remove-schedule'(data: RemoveScheduleRequest): SettingsChangeResponse;
  /** 活動の記録をすべて消す */
  'reset-activity'(): ResetActivityResponse;
  /** サイトの追跡を止める */
  'stop-tracking'(data: StopTrackingRequest): StopTrackingResponse;
  /** サイトのブロック設定の有効・無効を切り替える */
  'toggle-block'(data: ToggleBlockRequest): ToggleBlockResponse;
  /** スケジュールの有効・無効を切り替える（有効にしたら一時停止も解く） */
  'toggle-schedule'(data: ToggleScheduleRequest): SettingsChangeResponse;
  /** ブロックの一時停止を切り替える */
  'toggle-pause'(data: TogglePauseRequest): TogglePauseResponse;
  /** 開いているページの表示状態を知らせる（滞在時間の記録に使う） */
  'tracker-heartbeat'(data: TrackerHeartbeatRequest): TrackerHeartbeatResponse;
  /** 利用状況の送信への同意・拒否を保存する */
  'update-analytics-opt-in'(
    data: UpdateAnalyticsOptInRequest
  ): SettingsChangeResponse;
  /** 既定の表示設定の目標文を書き換える */
  'update-goal-text'(data: UpdateGoalTextRequest): SettingsChangeResponse;
  /** 残り時間の通知の設定を保存する */
  'update-notifications'(
    data: UpdateNotificationsRequest
  ): SettingsChangeResponse;
  /** スタイルの名前と表示設定を置き換える */
  'update-preset'(data: UpdatePresetRequest): SettingsChangeResponse;
  /** スケジュールの入力値を置き換える */
  'update-schedule'(data: UpdateScheduleRequest): SettingsChangeResponse;
  /** サイトの時間制限を変える */
  'update-time-limit'(data: UpdateTimeLimitRequest): UpdateTimeLimitResponse;
  /** 長押し確認の設定を保存する */
  'update-unblock-confirm'(
    data: UpdateUnblockConfirmRequest
  ): SettingsChangeResponse;
  /** youtube.com の非表示機能とアクセスブロックを変える */
  'update-youtube-settings'(
    data: UpdateYouTubeSettingsRequest
  ): UpdateYouTubeSettingsResponse;
}

/** background 側で onMessage に渡すハンドラの型。data は外部から届く値で型どおりとは限らないため、実行時の検証（zod）はハンドラ側で行う */
export type MessageHandler<TName extends keyof ProtocolMap> = (
  message: Message<ProtocolMap, TName> & ExtensionMessage
) => MaybePromise<GetReturnType<ProtocolMap[TName]>>;

/** ProtocolMap に沿って background と画面・コンテンツスクリプトの間で送受信する */
export const { sendMessage, onMessage, removeAllListeners } =
  defineExtensionMessaging<ProtocolMap>();
