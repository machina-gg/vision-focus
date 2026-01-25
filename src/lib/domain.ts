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

  // Check length limits (max 253 chars total, max 63 per label)
  if (cleanDomain.length > 253) return false

  const labels = cleanDomain.split('.')

  // Must have at least 2 labels (e.g., "example.com")
  if (labels.length < 2) return false

  // Each label validation
  const labelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

  for (const label of labels) {
    // Each label max 63 chars
    if (label.length === 0 || label.length > 63) return false
    // Labels cannot be all numbers (except for IP, but we don't allow IPs)
    if (!labelRegex.test(label)) return false
  }

  // TLD must be at least 2 chars and only letters
  const tld = labels[labels.length - 1]
  if (!/^[a-zA-Z]{2,}$/.test(tld)) return false

  return true
}

// Generate cryptographically secure unique ID
export function generateId(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
}
