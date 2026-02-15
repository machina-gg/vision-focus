/**
 * Centralized type definitions for background message handlers
 * Types are now inferred from Zod schemas in messageSchemas.ts to avoid duplication
 */

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
  limitReached?: boolean;
}

// Remove Block
export interface RemoveBlockRequest {
  id: string;
}

export interface RemoveBlockResponse {
  success: boolean;
}

// Get Stats
export type GetStatsRequest = Record<string, never>;

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

// Tracker Heartbeat (use TrackerHeartbeatBody from messageSchemas.ts)
export type TrackerHeartbeatRequest = import('./messageSchemas').TrackerHeartbeatBody;

export interface TrackerHeartbeatResponse {
  success: boolean;
  error?: string;
}
