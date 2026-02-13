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
    container: "text=/今日の目標|Today's Goal/i",
    goalText: "text=/今日の目標|Today's Goal/i >> .. >> p.text-base"
  },

  // QuickBlockButton
  quickBlock: {
    heading: 'text=/ウェブサイトをブロック|Block Websites/i',
    input: 'input[placeholder*="example.com"]',
    button: 'button:has-text("ブロック"), button:has-text("Block")'
  },

  // Today's Summary
  summary: {
    heading: "text=/今日のサマリー|Today's Summary/i",
    blockCount: "text=/今日のブロック|Today's Blocks/i >> .. >> p.text-2xl",
    topBlockedSite:
      'text=/トップブロックサイト|Top Blocked Site/i >> .. >> p.text-sm',
    noBlockedSites:
      'text=/まだブロックサイトはありません|No blocked sites yet/i'
  },

  // Premium
  premium: {
    analyticsLink:
      'button:has-text("分析を見る"), button:has-text("View Analytics")'
  },

  // Modals
  modal: {
    analyticsOptIn: '[role="dialog"], .modal',
    passwordModal: '[role="dialog"], .modal'
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
    invalid: 'wrong'
  }
};
