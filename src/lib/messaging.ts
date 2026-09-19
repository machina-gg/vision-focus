/**
 * background と画面・コンテンツスクリプトの間のメッセージング。
 *
 * name ごとの引数と戻り値を ProtocolMap で 1 箇所に定義し、送信側
 * （`sendMessage`）と受信側（`onMessage`）の双方を型で縛る。
 * Request / Response の実体は `~/types/messages` にあり、ここでは束ねるだけ
 */

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
  GetRemainingTimeRequest,
  GetRemainingTimeResponse,
  GetStatsResponse,
  RemoveBlockRequest,
  RemoveBlockResponse,
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

/**
 * メッセージ名 → 引数と戻り値の対応。
 *
 * 関数シグネチャで書くと引数が data の型、戻り値が応答の型になる。
 * 引数を取らないメッセージは引数なしの関数として書く（`get-stats`）
 */
export interface ProtocolMap {
  'add-block'(data: AddBlockRequest): AddBlockResponse;
  'get-remaining-time'(data: GetRemainingTimeRequest): GetRemainingTimeResponse;
  'get-stats'(): GetStatsResponse;
  'remove-block'(data: RemoveBlockRequest): RemoveBlockResponse;
  'toggle-block'(data: ToggleBlockRequest): ToggleBlockResponse;
  'toggle-pause'(data: TogglePauseRequest): TogglePauseResponse;
  'tracker-heartbeat'(data: TrackerHeartbeatRequest): TrackerHeartbeatResponse;
  'update-time-limit'(data: UpdateTimeLimitRequest): UpdateTimeLimitResponse;
  'update-youtube-settings'(
    data: UpdateYouTubeSettingsRequest
  ): UpdateYouTubeSettingsResponse;
}

/**
 * background 側のハンドラの型。
 *
 * `onMessage(name, handler)` に渡せる形を name から導く。data は ProtocolMap の
 * 引数型になるが、外部から届く値なので実行時の検証（zod）はハンドラ側で行う
 */
export type MessageHandler<TName extends keyof ProtocolMap> = (
  message: Message<ProtocolMap, TName> & ExtensionMessage
) => MaybePromise<GetReturnType<ProtocolMap[TName]>>;

export const { sendMessage, onMessage, removeAllListeners } =
  defineExtensionMessaging<ProtocolMap>();
