/**
 * i18n helper for Chrome extension
 * Supports manual language switching while defaulting to browser language
 */

import type { SupportedLanguage } from '~/types/storage'

// Import messages directly
import enMessages from '../../assets/_locales/en/messages.json'
import jaMessages from '../../assets/_locales/ja/messages.json'

type MessageFile = Record<string, { message: string; placeholders?: Record<string, { content: string }> }>

const messages: Record<SupportedLanguage, MessageFile> = {
  en: enMessages as MessageFile,
  ja: jaMessages as MessageFile,
}

// Current language (null = use browser language)
let currentLanguage: SupportedLanguage | null = null

/**
 * Get the browser's UI language
 */
export function getBrowserLanguage(): SupportedLanguage {
  try {
    const lang = chrome.i18n.getUILanguage()
    return lang.startsWith('ja') ? 'ja' : 'en'
  } catch {
    return 'en'
  }
}

/**
 * Get the effective current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  return currentLanguage ?? getBrowserLanguage()
}

/**
 * Set the current language
 * @param lang - The language to set, or null to use browser language
 */
export function setCurrentLanguage(lang: SupportedLanguage | null): void {
  currentLanguage = lang
}

/**
 * Get a localized message
 * @param messageName - The message name from messages.json
 * @param substitutions - Optional substitutions for placeholders
 * @returns The localized message or the message name if not found
 */
export function getMessage(
  messageName: string,
  substitutions?: string | string[]
): string {
  const lang = getCurrentLanguage()
  const messageObj = messages[lang]?.[messageName]

  if (!messageObj) {
    // Fallback to English
    const enMessageObj = messages.en?.[messageName]
    if (!enMessageObj) {
      return messageName
    }
    return applySubstitutions(enMessageObj.message, substitutions)
  }

  return applySubstitutions(messageObj.message, substitutions)
}

/**
 * Apply substitutions to a message
 */
function applySubstitutions(
  message: string,
  substitutions?: string | string[]
): string {
  if (!substitutions) return message

  const subs = Array.isArray(substitutions) ? substitutions : [substitutions]
  let result = message

  subs.forEach((sub, index) => {
    result = result.replace(`$${index + 1}`, sub)
    // Also handle named placeholders like $DOMAIN$
    result = result.replace(/\$[A-Z_]+\$/g, sub)
  })

  return result
}

/**
 * Get the current UI language (for compatibility)
 * @returns The current language code (e.g., 'en', 'ja')
 */
export function getUILanguage(): SupportedLanguage {
  return getCurrentLanguage()
}

/**
 * Check if the current language is Japanese
 */
export function isJapanese(): boolean {
  return getCurrentLanguage() === 'ja'
}

/**
 * Format a number for display
 * @param num - The number to format
 * @returns The formatted number string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString(getCurrentLanguage())
}

/**
 * Format a date for display
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns The formatted date string
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(getCurrentLanguage(), options)
}

/**
 * Get all supported languages with their display names
 */
export function getSupportedLanguages(): { code: SupportedLanguage; name: string }[] {
  return [
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
  ]
}
