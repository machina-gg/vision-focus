// Premium feature types and limits

// Premium feature identifiers
export type PremiumFeature =
  | 'unlimited_blocklist'
  | 'custom_background'
  | 'dashboard_presets'
  | 'unsplash'
  | 'unlimited_history'
  | 'weekly_report'
  | 'monthly_report'
  | 'github_integration'
  | 'unblock_analytics'; // View unblocked site usage time and re-block

// Feature limits type
export interface FeatureLimits {
  maxBlockList: number;
  historyDays: number;
  maxPresets: number;
}

// Feature limits
export const FEATURE_LIMITS: {
  free: FeatureLimits;
  premium: FeatureLimits;
} = {
  free: {
    maxBlockList: Infinity, // Unlimited for all users
    historyDays: 7,
    maxPresets: 2
  },
  premium: {
    maxBlockList: Infinity,
    historyDays: Infinity,
    maxPresets: 10
  }
};

// Legacy export for backwards compatibility
export const FREE_TIER_LIMITS = FEATURE_LIMITS.free;
