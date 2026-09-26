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
  AddTrackedSiteRequest,
  AddTrackedSiteResponse,
  GetRemainingTimeRequest,
  GetRemainingTimeResponse,
  ImportSettingsRequest,
  ImportSettingsResponse,
  RemoveBlockRequest,
  RemoveBlockResponse,
  ResetActivityResponse,
  StopTrackingRequest,
  StopTrackingResponse,
  ToggleBlockRequest,
  ToggleBlockResponse,
  TogglePauseRequest,
  TogglePauseResponse,
  TrackerHeartbeatRequest,
  TrackerHeartbeatResponse,
  UpdateTimeLimitRequest,
  UpdateTimeLimitResponse,
  UpdateYouTubeSettingsRequest,
  UpdateYouTubeSettingsResponse
} from '~/types/messages';

/** メッセージ名ごとの引数と戻り値。送信側と受信側の型をここで縛る */
export interface ProtocolMap {
  /** サイトをブロックリストに追加する */
  'add-block'(data: AddBlockRequest): AddBlockResponse;
  /** サイトの追跡だけを始める */
  'add-tracked-site'(data: AddTrackedSiteRequest): AddTrackedSiteResponse;
  /** 開いているページのサイトの時間制限と今日の残り秒数を返す */
  'get-remaining-time'(data: GetRemainingTimeRequest): GetRemainingTimeResponse;
  /** 設定ファイルの設定と追跡中のサイトを取り込む */
  'import-settings'(data: ImportSettingsRequest): ImportSettingsResponse;
  /** サイトのブロック設定を外す（追跡は続く） */
  'remove-block'(data: RemoveBlockRequest): RemoveBlockResponse;
  /** 活動の記録をすべて消す */
  'reset-activity'(): ResetActivityResponse;
  /** サイトの追跡を止める */
  'stop-tracking'(data: StopTrackingRequest): StopTrackingResponse;
  /** サイトのブロック設定の有効・無効を切り替える */
  'toggle-block'(data: ToggleBlockRequest): ToggleBlockResponse;
  /** ブロックの一時停止を切り替える */
  'toggle-pause'(data: TogglePauseRequest): TogglePauseResponse;
  /** 開いているページの表示状態を知らせる（滞在時間の記録に使う） */
  'tracker-heartbeat'(data: TrackerHeartbeatRequest): TrackerHeartbeatResponse;
  /** サイトの時間制限を変える */
  'update-time-limit'(data: UpdateTimeLimitRequest): UpdateTimeLimitResponse;
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
