import { extractDomain, matchesDomain, generateId } from '~/lib/domain'
import { getSettings } from '~/lib/storage'
import { isWithinSchedule } from '~/lib/time'
import { BLOCKER_CONFIG } from '~/constants/limits'
import type { AppSettings, BlockItem } from '~/types/storage'

// Update declarativeNetRequest rules based on current settings
export async function updateBlockRules(): Promise<void> {
  const settings = await getSettings()

  // If paused, don't block anything
  if (settings.paused) {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
    const removeRuleIds = existingRules.map((rule) => rule.id)
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: [],
    })
    return
  }

  // Get domains to block
  const domainsToBlock = getActiveBlockedDomains(settings.blockList, settings)

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
        id: BLOCKER_CONFIG.RULE_ID_OFFSET + index,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            extensionPath: '/newtab.html',
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
}

// Get list of domains that should be actively blocked
function getActiveBlockedDomains(
  blockList: BlockItem[],
  settings: AppSettings
): string[] {
  const domainsToBlock: string[] = []

  for (const item of blockList) {
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

  // If paused, don't block
  if (settings.paused) return false

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
    id: generateId(),
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
