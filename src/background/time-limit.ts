/**
 * Time Limit Module
 *
 * This module re-exports time limit functionality from the specialized services.
 * Kept for backwards compatibility with existing imports.
 *
 * @see ~/lib/timeLimitService.ts for domain time limit logic
 * @see ~/lib/youtubeBlockService.ts for YouTube-specific logic
 * @see ~/lib/blockService.ts for block state determination
 * @see docs/BLOCK_STATE_MACHINE.md for state transition documentation
 */

export {
  findBlockItemForDomain,
  findEnabledBlockItemForDomain
} from '~/lib/blockService';

export {
  hasExceededTimeLimit,
  getRemainingTime,
  recordTimeLimitUsage,
  resetExpiredUsage,
  getTimeLimitInfo as getTimeLimitInfoForUrl
} from '~/lib/timeLimitService';

export {
  recordYouTubeTimeLimitUsage,
  hasYouTubeExceededTimeLimit,
  getYouTubeRemainingTime,
  incrementYouTubeBlockCount
} from '~/lib/youtubeBlockService';

// Type re-exports
export type { TimeLimitInfo } from '~/lib/timeLimitService';
