/**
 * Centralized type definitions for background message handlers
 * Types are now inferred from Zod schemas in messageSchemas.ts to avoid duplication
 *
 * ここで定義した Request / Response を `src/lib/messaging.ts` の ProtocolMap が
 * name ごとに束ねる。送信側の引数と戻り値はその ProtocolMap で縛られる
 */

import type { TimeLimitInfo } from '~/lib/timeLimitService';

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

// Remove Block
export interface RemoveBlockRequest {
  id: string;
}

export interface RemoveBlockResponse {
  success: boolean;
}

// Get Stats（引数を取らないため Request 型は持たない）
export interface GetStatsResponse {
  wasteTime: number;
  investTime: number;
  blockCount: number;
  unblockCount: number;
  topBlockedSite: {
    domain: string;
    count: number;
  } | null;
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
// 送信側が渡すのは applyImportedSettings で組み立てた適用後の設定。
// 受信側の実行時検証（ImportSettingsBodySchema）は古い保存データも受け付けるよう
// 緩めてあるため、送信側の型にはそのまま AppSettings を使う
export interface ImportSettingsRequest {
  settings: import('./storage').AppSettings;
}

export interface ImportSettingsResponse {
  success: boolean;
  error?: string;
}

// Set Site Category
export interface SetSiteCategoryRequest {
  domain: string;
  category: 'waste' | 'invest' | 'neutral';
}

export interface SetSiteCategoryResponse {
  success: boolean;
  error?: string;
}

// Toggle Block
export interface ToggleBlockRequest {
  id: string;
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
