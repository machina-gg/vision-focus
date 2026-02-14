/**
 * E2Eテスト用定数
 *
 * テストで使用する URL パターン、セレクタ、テストデータなどを定義
 */

// 拡張機能のURL
export const EXTENSION_URLS = {
  popup: (extensionId: string) =>
    `chrome-extension://${extensionId}/popup.html`,
  newtab: (extensionId: string) =>
    `chrome-extension://${extensionId}/newtab.html`,
  options: (extensionId: string) =>
    `chrome-extension://${extensionId}/options.html`
};

// テスト用のドメイン
export const TEST_DOMAINS = {
  example: 'example.com',
  youtube: 'youtube.com',
  reddit: 'reddit.com',
  twitter: 'twitter.com'
};

// セレクタ（実装に合わせて調整）
export const SELECTORS = {
  // Header
  header: {
    logo: 'img[alt="VisionFocus"]',
    settingsButton: 'button[title*="設定"], button[title*="Settings"]',
    helpButton: 'button[title*="ヘルプ"], button[title*="Help"]',
    pauseToggle: '[role="switch"]',
    languageSelector: 'select'
  },

  // GoalCard
  goalCard: {
    container: '[class*="group"]',
    heading: "text=/今日の目標|Today's Goal/i",
    goalText: 'p.text-base.font-medium.text-gray-800'
  },

  // QuickBlockButton
  quickBlock: {
    heading: 'text=/ウェブサイトをブロック|Block Websites/i',
    input: 'input[type="text"]',
    button: 'button:has-text("ブロック"), button:has-text("Block")'
  },

  // Today's Summary
  summary: {
    heading: "text=/今日のサマリー|Today's Summary/i",
    blockCount: 'p.text-2xl.font-bold.text-block-600',
    topBlockedSiteDomain: 'p.text-sm.font-bold.text-info-600',
    noBlockedSites: 'p.text-sm.text-gray-400'
  },

  // Premium
  premium: {
    analyticsLink:
      'button:has-text("分析を見る"), button:has-text("View Analytics")'
  },

  // Modals
  modal: {
    analyticsOptIn: '[role="dialog"], .modal',
    passwordModal: '[role="dialog"], .modal',
    unblockConfirm: '[role="dialog"], .modal'
  },

  // NewTab
  newtab: {
    container: '.newtab-container',
    goalText: 'h1',
    subText: 'p',
    blockInfo: '.animate-fade-in',
    overlay: '.absolute.inset-0.bg-black\\/30',
    miniStats: {
      blockCount: 'p.text-xl.font-bold.text-block-600',
      blockingDays: 'p.text-xl.font-bold.text-info-600'
    },
    downloadButton: 'button',
    settingsButton: 'button'
  },

  // Options
  options: {
    header: 'header',
    title: 'h1',
    tabsNav: 'nav[aria-label="Tabs"]',
    blocklistTab: 'button',
    domainInput: 'input[type="text"]',
    addButton: 'button',
    deleteButton:
      'button[title*="削除"], button[title*="Delete"], button[title*="Remove"]',
    toggle: '[role="switch"]',
    youtubeSection: 'text=/YouTube/i',
    notificationSection: 'text=/Notification|通知/i'
  }
};

// テストデータ
export const TEST_DATA = {
  goal: {
    default: 'Focus on what matters',
    custom: 'カスタム目標テキスト'
  },
  password: {
    valid: 'test1234',
    validHash:
      '1b4f0e9851971998e732078544c96b36c3d01cedf7caa332359d6f1d83567014', // SHA-256("test1234")
    invalid: 'wrong'
  }
};
