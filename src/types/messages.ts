import type { TimeLimitType } from './site';

export {
  type GetRemainingTimeBody,
  type TrackerHeartbeatBody,
  type UpdateTimeLimitBody
} from './messageSchemas';

export interface AddBlockRequest {
  domain: string;
}

export interface AddBlockResponse {
  success: boolean;
  error?: string;
}

export interface AddTrackedSiteRequest {
  domain: string;
}

export interface AddTrackedSiteResponse {
  success: boolean;
  error?: string;
}

export interface RemoveBlockRequest {
  domain: string;
}

export interface RemoveBlockResponse {
  success: boolean;
}

/** 開いているページのサイトの時間制限（ポップアップの残り時間表示が読む） */
export interface TimeLimitInfo {
  hasTimeLimit: boolean;
  /** 今日の残り秒数（超過後は 0）。時間制限が無い・一時停止中・スケジュール外なら null */
  remainingSeconds: number | null;
  limitType: TimeLimitType | null;
  limitSeconds: number | null;
}

export type GetRemainingTimeRequest =
  import('./messageSchemas').GetRemainingTimeBody;

export interface GetRemainingTimeResponse {
  success: boolean;
  /** null = 開いているページのサイトに有効なブロック設定が無い */
  data?: TimeLimitInfo | null;
  error?: string;
}

export interface ImportSettingsRequest {
  settings: import('./storage').AppSettings;
  sites: import('./site').TrackedSite[];
}

/** 既存のサイトと入れ子になるため取り込まなかったサイト */
export interface SkippedNestedSite {
  /** ファイルに書かれていた表記 */
  domain: string;
  /** 入れ子の相手（既存か、先に取り込んだサイト） */
  conflict: import('./site').SiteKey;
}

export interface ImportSettingsResponse {
  success: boolean;
  error?: string;
  skipped?: SkippedNestedSite[];
}

export interface ResetActivityResponse {
  success: boolean;
}

export interface StopTrackingRequest {
  domain: string;
}

export interface StopTrackingResponse {
  success: boolean;
  error?: string;
}

export interface ToggleBlockRequest {
  domain: string;
  enabled: boolean;
}

export interface ToggleBlockResponse {
  success: boolean;
  error?: string;
}

export interface TogglePauseRequest {
  paused: boolean;
}

export interface TogglePauseResponse {
  success: boolean;
  paused: boolean;
}

export type TrackerHeartbeatRequest =
  import('./messageSchemas').TrackerHeartbeatBody;

export interface TrackerHeartbeatResponse {
  success: boolean;
  error?: string;
}

export type UpdateTimeLimitRequest =
  import('./messageSchemas').UpdateTimeLimitBody;

export interface UpdateTimeLimitResponse {
  success: boolean;
  error?: string;
}

export type UpdateYouTubeSettingsRequest =
  import('./messageSchemas').UpdateYouTubeSettingsBody;

export interface UpdateYouTubeSettingsResponse {
  success: boolean;
  error?: string;
}
