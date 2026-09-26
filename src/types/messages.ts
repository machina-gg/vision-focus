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

export interface TimeLimitInfo {
  hasTimeLimit: boolean;
  remainingSeconds: number | null;
  limitType: TimeLimitType | null;
  limitSeconds: number | null;
}

export type GetRemainingTimeRequest =
  import('./messageSchemas').GetRemainingTimeBody;

export interface GetRemainingTimeResponse {
  success: boolean;
  data?: TimeLimitInfo | null;
  error?: string;
}

export interface ImportSettingsRequest {
  settings: import('./storage').AppSettings;
  sites: import('./site').TrackedSite[];
}

export interface SkippedNestedSite {
  domain: string;
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
