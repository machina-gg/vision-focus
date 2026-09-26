import type {
  GetRemainingTimeBody,
  TrackerHeartbeatBody,
  UpdateTimeLimitBody
} from './messageSchemas';
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
      /** 既存のサイトと入れ子になる */
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
      /** ブロック設定か YouTube の機能が残っているため追跡をやめられない */
      code: 'site-in-use';
    }
  | {
      /** 保存に失敗した */
      code: 'save-failed';
    };

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

/** サイトをブロックリストから外す依頼 */
export interface RemoveBlockRequest {
  /** 外す項目のドメイン */
  domain: string;
}

/** ブロックリストから外した結果 */
export interface RemoveBlockResponse {
  /** 外せたか */
  success: boolean;
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

/** 書き出したファイルの設定と追跡中のサイトを取り込む依頼 */
export interface ImportSettingsRequest {
  /** 取り込むアプリ設定 */
  settings: import('./storage').AppSettings;
  /** 取り込む追跡中のサイト */
  sites: import('./site').TrackedSite[];
}

/** 既存のサイトと入れ子になるため取り込まなかったサイト */
interface SkippedNestedSite {
  /** ファイルに書かれていた表記 */
  domain: string;
  /** 入れ子の相手（既存か、先に取り込んだサイト） */
  conflict: import('./site').SiteKey;
}

/** 設定の取り込みの結果 */
export interface ImportSettingsResponse {
  /** 取り込めたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
  /** 入れ子になるため取り込まなかったサイト */
  skipped?: SkippedNestedSite[];
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
}

/** 有効・無効の切り替えの結果 */
export interface ToggleBlockResponse {
  /** 切り替えられたか */
  success: boolean;
  /** 失敗の種類。成功時は無い */
  error?: MessageError;
}

/** すべてのブロックの一時停止を切り替える依頼 */
export interface TogglePauseRequest {
  /** true = 一時停止する / false = 再開する */
  paused: boolean;
}

/** 一時停止の切り替えの結果 */
export interface TogglePauseResponse {
  /** 切り替えられたか */
  success: boolean;
  /** 切り替え後の一時停止の状態 */
  paused: boolean;
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
