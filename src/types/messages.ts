import type {
  AddAllowedSiteBody,
  AddScheduleBody,
  CreatePresetBody,
  GetRemainingTimeBody,
  ImportSettingsBody,
  PresetIdBody,
  RemoveScheduleBody,
  ToggleScheduleBody,
  TogglePauseBody,
  TrackerHeartbeatBody,
  UpdateAnalyticsOptInBody,
  UpdateGoalTextBody,
  UpdateNotificationsBody,
  UpdatePresetBody,
  UpdateScheduleBody,
  UpdateTimeLimitBody,
  UpdateUnblockConfirmBody,
  SetPasswordBody,
  ChangePasswordBody,
  RemovePasswordBody,
  SetAllowedSiteRecordingBody
} from './messageSchemas';
import type { PasswordStrengthProblem } from '~/lib/password';
import type { NestedSite } from '~/lib/siteKey';
import type { TimeLimitType } from './site';

/** background が画面へ返す失敗の種類。文言は画面が messageErrorText で i18n にする */
export type MessageError =
  | {
      /** 依頼の本文が不正 */
      code: 'invalid-request';
    }
  | {
      /** URL を読めない */
      code: 'invalid-url';
    }
  | {
      /** ドメインとして正しくない */
      code: 'invalid-domain';
    }
  | {
      /** 既にブロックリストにある */
      code: 'already-blocked';
    }
  | {
      /** 既に追跡中 */
      code: 'already-tracked';
    }
  | {
      /** 許可サイトとして登録済み（ブロック・YouTube 設定には変えない） */
      code: 'already-allowed';
    }
  | {
      /** 既存のサイトと許されない入れ子になる（祖先・子孫の組を許すのは子孫が許可サイトのときだけ） */
      code: 'nested-site';
      /** 依頼された表記 */
      domain: string;
      /** 入れ子になる既存のサイトとその関係 */
      nested: NestedSite;
    }
  | {
      /** ブロックリストに対象の項目が無い */
      code: 'block-not-found';
    }
  | {
      /** 対象の許可サイトが無い */
      code: 'allow-not-found';
    }
  | {
      /** ブロックの規則か YouTube の機能が残っているため追跡をやめられない */
      code: 'site-in-use';
    }
  | {
      /** 曜日を共有し時間帯が交差するスケジュールが既にある */
      code: 'schedule-overlap';
    }
  | {
      /** 指定された ID のスケジュールが無い */
      code: 'schedule-not-found';
    }
  | {
      /** 指定されたスタイルが無い */
      code: 'preset-not-found';
    }
  | {
      /** スタイルが上限（MAX_PRESETS）に達している */
      code: 'preset-limit';
    }
  | {
      /** スタイルの画像が JPEG の data URL でないか、上限（IMAGE_LIMITS.TARGET_SIZE）より長い */
      code: 'image-invalid';
    }
  | {
      /** 保存に失敗した */
      code: 'save-failed';
    }
  | {
      /** パスワード保護中にブロックを弱める操作へパスワードが添えられていない */
      code: 'password-required';
    }
  | {
      /** パスワードが保存済みのものと一致しない */
      code: 'password-mismatch';
    }
  | {
      /** パスワードが設定されていない */
      code: 'password-not-set';
    }
  | {
      /** パスワードが既に設定されている */
      code: 'password-already-set';
    }
  | {
      /** 新しいパスワードの長さが範囲外 */
      code: 'password-invalid';
      /** 範囲外である理由 */
      reason: PasswordStrengthProblem;
    };

/** 設定を書き換える依頼の結果（スケジュール・通知・長押し確認・利用状況の送信への同意・表示設定で共通） */
export interface SettingsChangeResponse {
  /** 書き換えられたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** スケジュールを足す依頼 */
export type AddScheduleRequest = AddScheduleBody;

/** スケジュールの入力値を置き換える依頼 */
export type UpdateScheduleRequest = UpdateScheduleBody;

/** スケジュールを消す依頼 */
export type RemoveScheduleRequest = RemoveScheduleBody;

/** スケジュールの有効・無効を切り替える依頼 */
export type ToggleScheduleRequest = ToggleScheduleBody;

/** 残り時間の通知の設定を保存する依頼 */
export type UpdateNotificationsRequest = UpdateNotificationsBody;

/** 長押し確認の設定を保存する依頼 */
export type UpdateUnblockConfirmRequest = UpdateUnblockConfirmBody;

/** 利用状況の送信への同意・拒否を保存する依頼 */
export type UpdateAnalyticsOptInRequest = UpdateAnalyticsOptInBody;

/** 既定の表示設定でスタイルを作る依頼 */
export type CreatePresetRequest = CreatePresetBody;

/** スタイルの作成の結果 */
export interface CreatePresetResponse {
  /** 作れたか */
  success: boolean;
  /** 作ったスタイルの ID。失敗時は無い */
  id?: string;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** スタイルの名前・表示設定・画像を置き換える依頼 */
export type UpdatePresetRequest = UpdatePresetBody;

/** スタイルを適用中にする依頼 */
export type ApplyPresetRequest = PresetIdBody;

/** スタイルを消す依頼（その画像も消し、適用中の指定とスケジュールからの参照も外す） */
export type DeletePresetRequest = PresetIdBody;

/** 既定の表示設定の目標文を書き換える依頼 */
export type UpdateGoalTextRequest = UpdateGoalTextBody;

/** サイトをブロックリストに加える依頼 */
export interface AddBlockRequest {
  /** 利用者が入力したドメインか URL（background がサイトキーに直す） */
  domain: string;
}

/** ブロックリストへの追加の結果 */
export interface AddBlockResponse {
  /** 追加できたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** サイトを追跡対象に加える依頼 */
export interface AddTrackedSiteRequest {
  /** 利用者が入力したドメインか URL（background がサイトキーに直す） */
  domain: string;
}

/** 追跡対象への追加の結果 */
export interface AddTrackedSiteResponse {
  /** 追加できたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** 許可サイトを追加する依頼（既に許可サイトなら何もせず成功） */
export type AddAllowedSiteRequest = AddAllowedSiteBody;

/** 許可サイトの追加の結果 */
export interface AddAllowedSiteResponse {
  /** 追加できたか（既に許可サイトだったときも true） */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** 許可サイトの「記録する」を切り替える依頼 */
export type SetAllowedSiteRecordingRequest = SetAllowedSiteRecordingBody;

/** 「記録する」の切り替えの結果 */
export interface SetAllowedSiteRecordingResponse {
  /** 切り替えられたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** サイトをブロックリストから外す依頼 */
export interface RemoveBlockRequest {
  /** 外す項目のドメイン */
  domain: string;
  /** パスワード保護中に照合するパスワード */
  password?: string;
}

/** ブロックリストから外した結果 */
export interface RemoveBlockResponse {
  /** 外せたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** 開いているページのサイトの時間制限（ポップアップの残り時間表示が読む） */
export interface TimeLimitInfo {
  /** 時間制限が設定されているか（false = 常時ブロック） */
  hasTimeLimit: boolean;
  /** 今日の残り秒数（超過後は 0）。時間制限が無い・一時停止中・スケジュール外なら null */
  remainingSeconds: number | null;
  /** 時間制限の種類。時間制限が無ければ null */
  limitType: TimeLimitType | null;
  /** 1 日あたりの上限（秒）。時間制限が無ければ null */
  limitSeconds: number | null;
}

/** 開いているページのサイトの時間制限を問い合わせる依頼 */
export type GetRemainingTimeRequest = GetRemainingTimeBody;

/** 時間制限の問い合わせの結果 */
export interface GetRemainingTimeResponse {
  /** 問い合わせを処理できたか */
  success: boolean;
  /** null = 開いているページのサイトに有効なブロック設定が無い */
  data?: TimeLimitInfo | null;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** 書き出したファイルの設定・表示設定と追跡中のサイトで保存済みの値を置き換える依頼（data は画面の取り込み前の検査を通ったもの。password はパスワード保護中に照合する） */
export type ImportSettingsRequest = ImportSettingsBody;

/** 設定の取り込みの結果 */
export interface ImportSettingsResponse {
  /** 取り込めたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
  /** 上限（MAX_PRESETS）を超えるため取り込まなかったスタイルの名前（ファイルの並び順） */
  skippedPresets?: string[];
  /** 取り込まなかったスタイルを指していたため、適用中のスタイルを外したか */
  clearedActivePreset?: boolean;
  /** 取り込まなかったスタイルを指していたため、取り込んだスケジュールからスタイルを外したか */
  clearedSchedulePresets?: boolean;
}

/** 活動の記録をすべて消した結果 */
export interface ResetActivityResponse {
  /** 消せたか */
  success: boolean;
}

/** サイトの追跡をやめ、その記録を消す依頼 */
export interface StopTrackingRequest {
  /** 追跡をやめるサイトのドメイン */
  domain: string;
}

/** 追跡をやめた結果 */
export interface StopTrackingResponse {
  /** やめられたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** ブロックリストの項目の有効・無効を切り替える依頼 */
export interface ToggleBlockRequest {
  /** 切り替える項目のドメイン */
  domain: string;
  /** true = ブロックを有効にする / false = 一時的に無効にする */
  enabled: boolean;
  /** パスワード保護中に無効にするときに照合するパスワード */
  password?: string;
}

/** 有効・無効の切り替えの結果 */
export interface ToggleBlockResponse {
  /** 切り替えられたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** すべてのブロックの一時停止を切り替える依頼 */
export type TogglePauseRequest = TogglePauseBody;

/** 一時停止の切り替えの結果 */
export interface TogglePauseResponse {
  /** 切り替えられたか */
  success: boolean;
  /** 切り替え後の一時停止の状態。失敗時は無い */
  paused?: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** 開いているページの表示状態の通知 */
export type TrackerHeartbeatRequest = TrackerHeartbeatBody;

/** 表示状態の通知を受け付けた結果 */
export interface TrackerHeartbeatResponse {
  /** 受け付けたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** ブロックリストの項目の時間制限を変える依頼 */
export type UpdateTimeLimitRequest = UpdateTimeLimitBody;

/** 時間制限の変更の結果 */
export interface UpdateTimeLimitResponse {
  /** 変えられたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** YouTube 設定の保存の依頼 */
export type UpdateYouTubeSettingsRequest =
  import('./messageSchemas').UpdateYouTubeSettingsBody;

/** YouTube 設定の保存の結果 */
export interface UpdateYouTubeSettingsResponse {
  /** 保存できたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** パスワードを設定する依頼 */
export type SetPasswordRequest = SetPasswordBody;

/** パスワードを変更する依頼 */
export type ChangePasswordRequest = ChangePasswordBody;

/** パスワード保護をやめる依頼 */
export type RemovePasswordRequest = RemovePasswordBody;
