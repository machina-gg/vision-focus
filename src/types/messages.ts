/**
 * Centralized type definitions for background message handlers
 * Types are now inferred from Zod schemas in messageSchemas.ts to avoid duplication
 *
 * ここで定義した Request / Response を `src/lib/messaging.ts` の ProtocolMap が
 * name ごとに束ねる。送信側の引数と戻り値はその ProtocolMap で縛られる
 */

import type { TimeLimitType } from './site';

// Re-export types inferred from Zod schemas
export {
  type GetRemainingTimeBody,
  type TrackerHeartbeatBody,
  type UpdateTimeLimitBody
} from './messageSchemas';

// Legacy types (not yet migrated to Zod schemas)
// TODO: Create Zod schemas for these and remove manual type definitions

// Add Block
export interface AddBlockRequest {
  domain: string;
}

export interface AddBlockResponse {
  success: boolean;
  error?: string;
}

// Add Tracked Site（ブロックせずに追跡だけを始める）
export interface AddTrackedSiteRequest {
  domain: string;
}

export interface AddTrackedSiteResponse {
  success: boolean;
  error?: string;
}

// Remove Block（domain はサイトキー）
export interface RemoveBlockRequest {
  domain: string;
}

export interface RemoveBlockResponse {
  success: boolean;
}

/**
 * 開いているページのサイトの時間制限（ポップアップの残り時間バッジが読む）。
 * 残り時間は判定（`evaluateBlock`）の値なので、一時停止中・スケジュール外は null になる
 */
export interface TimeLimitInfo {
  hasTimeLimit: boolean;
  remainingSeconds: number | null;
  limitType: TimeLimitType | null;
  limitSeconds: number | null;
}

// Get Remaining Time (use GetRemainingTimeBody from messageSchemas.ts)
export type GetRemainingTimeRequest =
  import('./messageSchemas').GetRemainingTimeBody;

export interface GetRemainingTimeResponse {
  success: boolean;
  data?: TimeLimitInfo | null;
  error?: string;
}

// Import Settings
// 送信側が渡すのは applyImportedSettings で組み立てた適用後の設定と、取り込む追跡中のサイト
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

// Reset Activity（引数を取らないため Request 型は持たない）
export interface ResetActivityResponse {
  success: boolean;
}

// Stop Tracking（domain はサイトキー。ブロック設定・YouTube 機能を持つサイトは止めない）
export interface StopTrackingRequest {
  domain: string;
}

export interface StopTrackingResponse {
  success: boolean;
  error?: string;
}

// Toggle Block（domain はサイトキー）
export interface ToggleBlockRequest {
  domain: string;
  enabled: boolean;
}

export interface ToggleBlockResponse {
  success: boolean;
  error?: string;
}

// Toggle Pause
export interface TogglePauseRequest {
  paused: boolean;
}

export interface TogglePauseResponse {
  success: boolean;
  paused: boolean;
}

// Tracker Heartbeat (use TrackerHeartbeatBody from messageSchemas.ts)
export type TrackerHeartbeatRequest =
  import('./messageSchemas').TrackerHeartbeatBody;

export interface TrackerHeartbeatResponse {
  success: boolean;
  error?: string;
}

// Update Time Limit (use UpdateTimeLimitBody from messageSchemas.ts)
export type UpdateTimeLimitRequest =
  import('./messageSchemas').UpdateTimeLimitBody;

export interface UpdateTimeLimitResponse {
  success: boolean;
  error?: string;
}

// Update YouTube Settings (use UpdateYouTubeSettingsBody from messageSchemas.ts)
export type UpdateYouTubeSettingsRequest =
  import('./messageSchemas').UpdateYouTubeSettingsBody;

export interface UpdateYouTubeSettingsResponse {
  success: boolean;
  error?: string;
}
