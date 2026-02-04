/**
 * Time Limit Module
 *
 * This module re-exports time limit functionality from the centralized BlockService.
 * Kept for backwards compatibility with existing imports.
 *
 * @see ~/lib/blockService.ts for the centralized implementation
 * @see docs/BLOCK_STATE_MACHINE.md for state transition documentation
 */

export {
  findBlockItemForDomain,
  findEnabledBlockItemForDomain,
  hasExceededTimeLimit,
  getRemainingTime,
  recordTimeLimitUsage,
  resetExpiredUsage,
  getTimeLimitInfo as getTimeLimitInfoForUrl,
  recordYouTubeTimeLimitUsage,
  hasYouTubeExceededTimeLimit,
  getYouTubeRemainingTime,
  incrementYouTubeBlockCount
} from '~/lib/blockService';

// Type re-exports
export type { TimeLimitInfo } from '~/lib/blockService';
