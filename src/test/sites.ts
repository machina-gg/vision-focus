import type { BlockedSite } from '~/lib/blockList';
import type {
  BlockRule,
  SiteKey,
  TrackedSite,
  TrackedSites,
  YouTubeFeatures
} from '~/types/site';

const ADDED_AT = '2024-01-01T00:00:00.000Z';

export function trackedSite(
  domain: SiteKey,
  overrides: Partial<TrackedSite> = {}
): TrackedSite {
  return {
    domain,
    trackedAt: ADDED_AT,
    block: null,
    youtube: null,
    ...overrides
  };
}

export function blockedSite(
  domain: SiteKey,
  block: Partial<BlockRule> = {},
  overrides: Omit<Partial<TrackedSite>, 'block'> = {}
): BlockedSite {
  return {
    ...trackedSite(domain, overrides),
    block: { enabled: true, addedAt: ADDED_AT, timeLimit: null, ...block }
  };
}

export function youtubeFeatures(
  overrides: Partial<YouTubeFeatures> = {}
): YouTubeFeatures {
  return {
    hideShorts: false,
    hideRecommendations: false,
    hideComments: false,
    hideHomeFeed: false,
    ...overrides
  };
}

export function sitesOf(...sites: TrackedSite[]): TrackedSites {
  return Object.fromEntries(sites.map((site) => [site.domain, site]));
}
