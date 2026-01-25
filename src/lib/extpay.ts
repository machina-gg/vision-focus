import ExtPay from 'extpay'

// ExtensionPay instance
const EXTPAY_ID = process.env.PLASMO_PUBLIC_EXTPAY_ID || 'visionfocus'

let extpay: ReturnType<typeof ExtPay> | null = null

/**
 * Get or create ExtensionPay instance
 */
export function getExtPay() {
  if (!extpay) {
    extpay = ExtPay(EXTPAY_ID)
  }
  return extpay
}

/**
 * ExtensionPay user status
 */
export interface ExtPayUser {
  paid: boolean
  paidAt: Date | null
  installedAt: Date
  trialStartedAt: Date | null
}

/**
 * Get current user's payment status from ExtensionPay
 */
export async function getExtPayUser(): Promise<ExtPayUser> {
  const ext = getExtPay()
  const user = await ext.getUser()
  return {
    paid: user.paid,
    paidAt: user.paidAt,
    installedAt: user.installedAt,
    trialStartedAt: user.trialStartedAt,
  }
}

/**
 * Check if user has paid (is premium)
 */
export async function isExtPayPremium(): Promise<boolean> {
  try {
    const user = await getExtPayUser()
    return user.paid
  } catch {
    // Assume not premium if check fails
    return false
  }
}

/**
 * Open ExtensionPay payment page
 */
export function openPaymentPage(): void {
  const ext = getExtPay()
  ext.openPaymentPage()
}

/**
 * Open ExtensionPay trial page (if trials are enabled)
 */
export function openTrialPage(): void {
  const ext = getExtPay()
  ext.openTrialPage()
}

/**
 * Open ExtensionPay login page (for users who already paid)
 */
export function openLoginPage(): void {
  const ext = getExtPay()
  ext.openLoginPage()
}

/**
 * Open ExtensionPay management page (for managing subscription)
 */
export function openManagementPage(): void {
  const ext = getExtPay()
  ext.openPaymentPage()
}

/**
 * Listen for payment status changes
 * Call this in background script to react to payment changes
 */
export function onPaid(callback: (user: ExtPayUser) => void): void {
  const ext = getExtPay()
  ext.onPaid.addListener((user) => {
    callback({
      paid: user.paid,
      paidAt: user.paidAt,
      installedAt: user.installedAt,
      trialStartedAt: user.trialStartedAt,
    })
  })
}

/**
 * Start background listener for ExtensionPay
 * Should be called once in background script
 */
export function startExtPayBackgroundListener(): void {
  const ext = getExtPay()
  ext.startBackground()
}
