/**
 * Zod schemas for validating message handler request bodies.
 * Replaces unsafe `as` type assertions with runtime validation.
 *
 * Types are automatically inferred from schemas using `z.infer<typeof Schema>`.
 * This ensures type safety and eliminates duplication between schemas and types.
 */

import * as z from 'zod';

// Schema for get-remaining-time message handler
export const GetRemainingTimeBodySchema = z.object({
  url: z.string().min(1)
});

export type GetRemainingTimeBody = z.infer<typeof GetRemainingTimeBodySchema>;

// Schema for tracker-heartbeat message handler
export const TrackerHeartbeatBodySchema = z.object({
  url: z.string().min(1).max(2048),
  status: z.enum(['active', 'inactive', 'heartbeat']),
  timestamp: z.number().finite().nonnegative().optional()
});

export type TrackerHeartbeatBody = z.infer<typeof TrackerHeartbeatBodySchema>;

// Schema for update-time-limit message handler
const TimeLimitSchema = z.object({
  type: z.enum(['daily', 'hourly']),
  limitSeconds: z.number().positive()
});

export const UpdateTimeLimitBodySchema = z.object({
  id: z.string().min(1),
  timeLimit: TimeLimitSchema.nullable()
});

export type UpdateTimeLimitBody = z.infer<typeof UpdateTimeLimitBodySchema>;

// Schema for AnalyticsData validation (used in youtube.ts content script)
const TimeLimitUsageSchema = z.object({
  domain: z.string(),
  dailyUsedSeconds: z.number(),
  hourlyUsedSeconds: z.number(),
  lastDailyReset: z.string(),
  lastHourlyReset: z.string()
});

const DailyStatSchema = z.object({
  date: z.string(),
  wasteTime: z.number(),
  investTime: z.number(),
  blockCount: z.number()
});

const SiteTimeSchema = z.object({
  domain: z.string(),
  time: z.number(),
  category: z.enum(['waste', 'invest', 'neutral']),
  lastUpdated: z.string()
});

const SiteBlockCountSchema = z.object({
  domain: z.string(),
  count: z.number(),
  lastBlocked: z.string()
});

export const AnalyticsDataSchema = z.object({
  dailyStats: z.record(z.string(), DailyStatSchema),
  siteTime: z.record(z.string(), SiteTimeSchema),
  siteCategories: z.record(z.string(), z.enum(['waste', 'invest', 'neutral'])),
  siteBlockCounts: z.record(z.string(), SiteBlockCountSchema),
  timeLimitUsage: z.record(z.string(), TimeLimitUsageSchema)
});

// Schema for YouTubeSettings validation (used in youtube.ts content script)
export const YouTubeSettingsSchema = z.object({
  enabled: z.boolean(),
  blockAccess: z.boolean().optional().default(false),
  hideShorts: z.boolean(),
  hideRecommendations: z.boolean(),
  hideComments: z.boolean(),
  hideSidebar: z.boolean(),
  hideHomeFeed: z.boolean(),
  timeLimit: TimeLimitSchema.nullable().optional()
});
