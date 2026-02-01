/**
 * Centralized type definitions for background message handlers
 */

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

// Tracker Heartbeat
export interface TrackerHeartbeatRequest {
  url: string;
  status: 'active' | 'inactive' | 'heartbeat';
  timestamp: number;
}

export interface TrackerHeartbeatResponse {
  success: boolean;
  error?: string;
}
