/**
 * BlockService - Centralized Block State Management
 *
 * This service provides a single source of truth for block state determination.
 * All block-related logic should go through this service to ensure consistency.
 *
 * Time limit logic has been extracted to ~/lib/timeLimitService.ts
 * YouTube-specific logic has been extracted to ~/lib/youtubeBlockService.ts
 *
 * @see docs/BLOCK_STATE_MACHINE.md for state transition diagrams
 */

import { getSettings } from '~/lib/storage';
import { extractDomain, matchesDomain } from '~/lib/domain';
import { isWithinSchedule } from '~/lib/time';
import type { AppSettings, BlockItem, Schedule } from '~/types/storage';
import { hasExceededTimeLimit, getRemainingTime } from '~/lib/timeLimitService';

// Block reason type - matches the state machine documentation
export type BlockReason = 'always_blocked' | 'time_limit_exceeded' | null;

// Block state result
export interface BlockState {
  blocked: boolean;
  reason: BlockReason;
  remainingSeconds?: number;
}

/**
 * Find the BlockItem that matches a domain (supports wildcards)
 * This is the single entry point for domain-to-block-item mapping
 */
export async function findBlockItemForDomain(
  domain: string,
  settings?: AppSettings
): Promise<BlockItem | null> {
  const s = settings ?? (await getSettings());
  return s.blockList.find((item) => matchesDomain(domain, item)) || null;
}

/**
 * Find the enabled BlockItem that matches a domain
 * Only returns items where enabled=true
 */
export async function findEnabledBlockItemForDomain(
  domain: string,
  settings?: AppSettings
): Promise<BlockItem | null> {
  const item = await findBlockItemForDomain(domain, settings);
  return item?.enabled ? item : null;
}

/**
 * Check if any schedule is currently active
 * No schedules = always active (return true)
 */
export function isAnyScheduleActive(schedules: Schedule[]): boolean {
  if (schedules.length === 0) return true;
  return schedules.some(
    (schedule) =>
      schedule.enabled &&
      isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
  );
}

/**
 * Determine the block state for a URL
 * This is the main entry point for block state determination
 *
 * Flow (see BLOCK_STATE_MACHINE.md):
 * 1. Check global pause
 * 2. Find matching block item
 * 3. Check if item is enabled
 * 4. Check schedules
 * 5. Check time limits
 */
export async function getBlockState(url: string): Promise<BlockState> {
  const domain = extractDomain(url);
  if (!domain) return { blocked: false, reason: null };

  const settings = await getSettings();

  // Step 1: Check global pause
  if (settings.paused) {
    return { blocked: false, reason: null };
  }

  // Step 2: Find matching block item
  const blockItem = await findBlockItemForDomain(domain, settings);
  if (!blockItem) {
    return { blocked: false, reason: null };
  }

  // Step 3: Check if item is enabled
  if (!blockItem.enabled) {
    return { blocked: false, reason: null };
  }

  // Step 4: Check schedules
  if (!isAnyScheduleActive(settings.schedules)) {
    return { blocked: false, reason: null };
  }

  // Step 5: Check time limits
  if (blockItem.timeLimit) {
    const exceeded = await hasExceededTimeLimit(domain, blockItem);
    const remaining = exceeded ? 0 : await getRemainingTime(domain, blockItem);
    return {
      blocked: exceeded,
      reason: exceeded ? 'time_limit_exceeded' : null,
      remainingSeconds: remaining ?? undefined
    };
  }

  // No time limit - always blocked
  return { blocked: true, reason: 'always_blocked' };
}

/**
 * Check if a URL should be blocked (convenience method)
 */
export async function shouldBlockUrl(url: string): Promise<boolean> {
  const state = await getBlockState(url);
  return state.blocked;
}

/**
 * Check if a domain should be tracked for block count
 * This validates all conditions: enabled, schedule, etc.
 */
export async function shouldTrackBlockForDomain(
  domain: string
): Promise<boolean> {
  const settings = await getSettings();

  // Check global pause
  if (settings.paused) {
    return false;
  }

  // Find matching block item
  const blockItem = await findBlockItemForDomain(domain, settings);
  if (!blockItem) {
    return false;
  }

  // Check if enabled
  if (!blockItem.enabled) {
    return false;
  }

  // Check schedules
  if (!isAnyScheduleActive(settings.schedules)) {
    return false;
  }

  return true;
}

/**
 * Get list of domains that should be actively blocked via declarativeNetRequest
 * Only includes always-blocked sites (no time limit) that are enabled and within schedule
 */
export async function getActiveBlockedDomains(): Promise<string[]> {
  const settings = await getSettings();

  // If paused, don't block anything
  if (settings.paused) {
    return [];
  }

  // If no schedule is active, don't block anything
  if (!isAnyScheduleActive(settings.schedules)) {
    return [];
  }

  // Only include always-blocked sites (enabled and no time limit)
  return settings.blockList
    .filter((item) => item.enabled && !item.timeLimit)
    .map((item) => item.domain);
}
