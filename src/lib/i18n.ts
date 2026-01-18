/**
 * i18n helper for Chrome extension
 * Uses chrome.i18n API with fallback to English
 */

/**
 * Get a localized message
 * @param messageName - The message name from _locales messages.json
 * @param substitutions - Optional substitutions for placeholders
 * @returns The localized message or the message name if not found
 */
export function getMessage(
  messageName: string,
  substitutions?: string | string[]
): string {
  try {
    const message = chrome.i18n.getMessage(messageName, substitutions)
    return message || messageName
  } catch {
    // Fallback for non-extension context (e.g., Storybook)
    return messageName
  }
}

/**
 * Get the current UI language
 * @returns The current language code (e.g., 'en', 'ja')
 */
export function getUILanguage(): string {
  try {
    return chrome.i18n.getUILanguage()
  } catch {
    return 'en'
  }
}

/**
 * Check if the current language is Japanese
 */
export function isJapanese(): boolean {
  return getUILanguage().startsWith('ja')
}

/**
 * Format a number for display
 * @param num - The number to format
 * @returns The formatted number string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString(getUILanguage())
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
  return d.toLocaleDateString(getUILanguage(), options)
}
