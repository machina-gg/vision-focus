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
  'add-block'(data: AddBlockRequest): AddBlockResponse;
  'add-tracked-site'(data: AddTrackedSiteRequest): AddTrackedSiteResponse;
  'get-remaining-time'(data: GetRemainingTimeRequest): GetRemainingTimeResponse;
  'import-settings'(data: ImportSettingsRequest): ImportSettingsResponse;
  'remove-block'(data: RemoveBlockRequest): RemoveBlockResponse;
  'reset-activity'(): ResetActivityResponse;
  'stop-tracking'(data: StopTrackingRequest): StopTrackingResponse;
  'toggle-block'(data: ToggleBlockRequest): ToggleBlockResponse;
  'toggle-pause'(data: TogglePauseRequest): TogglePauseResponse;
  'tracker-heartbeat'(data: TrackerHeartbeatRequest): TrackerHeartbeatResponse;
  'update-time-limit'(data: UpdateTimeLimitRequest): UpdateTimeLimitResponse;
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
