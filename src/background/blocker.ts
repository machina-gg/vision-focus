import { extractDomain, matchesDomain } from '~/lib/domain'
import { getSettings, getTempUnblocks } from '~/lib/storage'
import { isWithinSchedule } from '~/lib/time'
import type { BlockItem } from '~/types/storage'

const RULE_ID_OFFSET = 1000

// Update declarativeNetRequest rules based on current settings
export async function updateBlockRules(): Promise<void> {
  const settings = await getSettings()
  const tempUnblocks = await getTempUnblocks()
  const now = new Date()

  // Get domains to block
  const domainsToBlock = getActiveBlockedDomains(
    settings.blockList,
    settings,
    tempUnblocks,
    now
  )

  // Remove all existing rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existingRules.map((rule) => rule.id)

  // Create new rules
  const addRules: chrome.declarativeNetRequest.Rule[] = domainsToBlock.map(
    (domain, index) => {
      // Handle wildcard domains
      const isWildcard = domain.startsWith('*.')
      const baseDomain = isWildcard ? domain.replace('*.', '') : domain

      return {
        id: RULE_ID_OFFSET + index,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            extensionPath: `/tabs/blocked.html?domain=${encodeURIComponent(baseDomain)}`,
          },
        },
        condition: {
          urlFilter: isWildcard ? `||${baseDomain}` : `||${domain}`,
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      }
    }
  )

  // Update rules
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  })

  console.log(`Updated block rules: ${addRules.length} domains blocked`)
}

// Get list of domains that should be actively blocked
function getActiveBlockedDomains(
  blockList: BlockItem[],
  settings: ReturnType<typeof getSettings> extends Promise<infer T> ? T : never,
  tempUnblocks: Awaited<ReturnType<typeof getTempUnblocks>>,
  now: Date
): string[] {
  // Filter out temporarily unblocked domains
  const validTempUnblocks = tempUnblocks
    .filter((t) => new Date(t.expiresAt) > now)
    .map((t) => t.domain)

  // Get domains to block
  const domainsToBlock: string[] = []

  for (const item of blockList) {
    // Check if temporarily unblocked
    if (validTempUnblocks.includes(item.domain.replace('*.', ''))) {
      continue
    }

    // Check schedule restrictions
    if (settings.schedules.length > 0) {
      const isScheduled = settings.schedules.some(
        (schedule) =>
          schedule.enabled &&
          isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
      )
      if (!isScheduled) {
        continue
      }
    }

    domainsToBlock.push(item.domain)
  }

  return domainsToBlock
}

// Check if a specific URL should be blocked
export async function shouldBlockUrl(url: string): Promise<boolean> {
  const domain = extractDomain(url)
  if (!domain) return false

  const settings = await getSettings()
  const tempUnblocks = await getTempUnblocks()
  const now = new Date()

  // Check temp unblocks
  const isUnblocked = tempUnblocks.some(
    (t) => t.domain === domain && new Date(t.expiresAt) > now
  )
  if (isUnblocked) return false

  // Check if domain is in block list
  const isBlocked = settings.blockList.some((item) =>
    matchesDomain(domain, item)
  )
  if (!isBlocked) return false

  // Check schedules
  if (settings.schedules.length > 0) {
    const isScheduled = settings.schedules.some(
      (schedule) =>
        schedule.enabled &&
        isWithinSchedule(schedule.startTime, schedule.endTime, schedule.days)
    )
    return isScheduled
  }

  // No schedules, always block
  return true
}

// Add domain to block list and update rules
export async function addBlockedDomain(
  domain: string,
  isWildcard: boolean
): Promise<boolean> {
  const settings = await getSettings()

  // Check free tier limit
  if (settings.blockList.length >= 5) {
    // TODO: Check premium status
    return false
  }

  const newItem: BlockItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    domain: isWildcard ? `*.${domain.replace('*.', '')}` : domain,
    isWildcard,
    createdAt: new Date().toISOString(),
  }

  settings.blockList.push(newItem)

  const { setSettings } = await import('~/lib/storage')
  await setSettings(settings)
  await updateBlockRules()

  return true
}

// Remove domain from block list
export async function removeBlockedDomain(id: string): Promise<void> {
  const settings = await getSettings()
  settings.blockList = settings.blockList.filter((item) => item.id !== id)

  const { setSettings } = await import('~/lib/storage')
  await setSettings(settings)
  await updateBlockRules()
}
