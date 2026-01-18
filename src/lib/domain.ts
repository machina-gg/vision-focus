import type { BlockItem } from '~/types/storage'

// Extract domain from URL
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return null
  }
}

// Check if domain matches a block item (supports wildcards)
export function matchesDomain(domain: string, blockItem: BlockItem): boolean {
  const pattern = blockItem.domain.toLowerCase()
  const target = domain.toLowerCase()

  if (blockItem.isWildcard) {
    // Wildcard pattern: *.example.com
    // Should match: sub.example.com, www.example.com
    // Should NOT match: example.com itself
    const baseDomain = pattern.replace('*.', '')
    return target.endsWith('.' + baseDomain) || target === baseDomain
  }

  // Exact match
  return target === pattern
}

// Check if domain is blocked by any item in the list
export function isDomainBlocked(
  domain: string,
  blockList: BlockItem[]
): boolean {
  return blockList.some((item) => matchesDomain(domain, item))
}

// Parse domain input (detect wildcards)
export function parseDomainInput(input: string): {
  domain: string
  isWildcard: boolean
} {
  const trimmed = input.trim().toLowerCase()

  // Remove protocol if present
  let domain = trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '') // Remove path

  const isWildcard = domain.startsWith('*.')

  return { domain, isWildcard }
}

// Validate domain format
export function isValidDomain(domain: string): boolean {
  // Remove wildcard prefix for validation
  const cleanDomain = domain.replace(/^\*\./, '')

  // Basic domain validation regex
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*)*\.[a-zA-Z]{2,}$/

  return domainRegex.test(cleanDomain)
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
