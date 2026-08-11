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
    logo: '[data-testid="app-logo"]',
    container: '[data-testid="app-header"]',
    settingsButton: '[data-testid="settings-button"]',
    helpButton: '[data-testid="help-button"]',
    pauseToggle: '[data-testid="pause-toggle"]',
    languageSelector: '[data-testid="language-selector"]'
  },

  // GoalCard
  goalCard: {
    container: '[data-testid="goal-card"]',
    goalText: '[data-testid="goal-card-text"]'
  },

  // QuickBlockButton
  quickBlock: {
    heading: '[data-testid="quick-block-heading"]',
    input: '[data-testid="quick-block-input"]',
    button: '[data-testid="quick-block-button"]'
  },

  // Today's Summary
  summary: {
    heading: '[data-testid="summary-heading"]',
    blockCount: '[data-testid="summary-block-count"]',
    topBlockedSiteDomain: '[data-testid="summary-top-blocked-site"]',
    noBlockedSites: '[data-testid="summary-no-blocked-sites"]',
    wastedTime: '[data-testid="summary-wasted-time"]',
    unblockCount: '[data-testid="summary-unblock-count"]'
  },

  // Time limit（ポップアップ上部の残り時間表示）
  timeLimit: {
    info: '[data-testid="time-limit-info"]'
  },

  // Premium
  premium: {
    analyticsLink: '[data-testid="view-analytics-link"]'
  },

  // Modals（Modal コンポーネントは role="dialog" を持つ）
  modal: {
    analyticsOptIn: '[role="dialog"]',
    passwordModal: '[role="dialog"]',
    unblockConfirm: '[role="dialog"]',
    passwordConfirmButton: '[data-testid="password-modal-confirm"]',
    passwordCancelButton: '[data-testid="password-modal-cancel"]'
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

  // Options（共通）
  options: {
    header: 'header',
    title: 'h1',
    tabsNav: 'nav[aria-label="Tabs"]',
    tabs: '[role="tablist"]',
    blocklistTab: 'button',
    stylesTab: 'button:has-text("スタイル"), button:has-text("Styles")',
    schedulesTab:
      'button:has-text("スケジュール"), button:has-text("Schedules")',
    analyticsTab: 'button:has-text("分析"), button:has-text("Analytics")',
    premiumTab: 'button:has-text("Premium")',
    helpTab: 'button:has-text("ヘルプ"), button:has-text("Help")',
    domainInput: 'input[type="text"]',
    addButton: 'button',
    deleteButton:
      'button[title*="削除"], button[title*="Delete"], button[title*="Remove"]',
    toggle: '[role="switch"]',
    youtubeSection: 'text=/YouTube/i',
    notificationSection: 'text=/Notification|通知/i'
  },

  // Options - Styles Tab
  styles: {
    presetSelector: 'h2:has-text("Preset"), h2:has-text("プリセット")',
    createPresetButton:
      'button:has-text("新規プリセット"), button:has-text("New Preset")',
    createFirstPresetButton:
      'button:has-text("最初のプリセット"), button:has-text("Create First Preset")',
    presetButton: '.flex.flex-wrap.gap-2 > button',
    presetNameInput:
      'input[placeholder*="プリセット名"], input[placeholder*="Preset name"]',
    goalTextInput:
      'input[placeholder*="目標"], input[placeholder*="your goal"]',
    goalSubTextArea: 'textarea[maxLength="100"]',
    textColorPicker: 'input[type="color"]',
    backgroundTypeImage: 'button:has-text("画像"), button:has-text("Image")',
    backgroundTypeColor: 'button:has-text("単色"), button:has-text("Color")',
    backgroundImageOption: '.grid.grid-cols-3 > button',
    backgroundColorPicker: 'input[type="color"]',
    customBackgroundUpload: 'input[type="file"]',
    fontFamilySelect: 'select',
    saveButton: 'button:has-text("保存"), button:has-text("Save")',
    applyButton: 'button:has-text("適用"), button:has-text("Apply")',
    deleteButton:
      'button:has-text("削除"), button:has-text("Delete"), button:has(svg.lucide-trash-2)',
    preview: '.relative.aspect-video'
  },

  // Options - Schedules Tab
  schedules: {
    weeklyCalendar: '.grid.grid-cols-7',
    addScheduleButton:
      'button:has-text("スケジュールを追加"), button:has-text("Add Schedule")',
    scheduleItem: '.flex.items-center.justify-between.p-4',
    scheduleToggle: '[role="switch"]',
    editButton: 'button:has-text("編集"), button:has-text("Edit")',
    deleteButton: 'button:has(svg.lucide-trash-2)',
    scheduleModal: '[role="dialog"]',
    scheduleNameInput:
      'input[placeholder*="スケジュール名"], input[placeholder*="Schedule name"]',
    startTimeInput: 'input[type="time"]:first-of-type',
    endTimeInput: 'input[type="time"]:last-of-type',
    dayCheckbox: 'input[type="checkbox"]',
    presetSelect: 'select',
    saveScheduleButton: 'button:has-text("保存"), button:has-text("Save")',
    noSchedules: 'text=/スケジュールがありません|No schedules/i'
  },

  // Options - Analytics Tab
  analytics: {
    siteRankingList:
      'h3:has-text("よくブロックしたサイト"), h3:has-text("Top Blocked Sites")',
    trackedSitesList:
      'h3:has-text("追跡中のサイト"), h3:has-text("Tracked Sites")',
    unblockHistory: 'h3:has-text("Unblock History"), h3:has-text("解除履歴")',
    wastedTimeSection:
      'h3:has-text("サイト別浪費時間"), h3:has-text("Wasted Time by Site")',
    exportButton: 'button:has-text("CSV"), button:has-text("Export")',
    refreshButton: 'button:has-text("更新"), button:has-text("Refresh")',
    resetButton: 'button:has-text("リセット"), button:has-text("Reset")',
    reblockButton: 'button:has-text("再ブロック"), button:has-text("Re-block")',
    stopTrackingButton:
      'button:has-text("追跡を停止"), button:has-text("Stop tracking")',
    addSiteInput: 'input[placeholder*="example.com"]',
    addSiteButton: 'button:has-text("追加"), button:has-text("Add")'
  },

  // Options - Premium Tab
  premiumTab: {
    upgradeButton:
      'button:has-text("Premium にアップグレード"), button:has-text("Upgrade to Premium")',
    manageSubscriptionButton:
      'button:has-text("サブスク管理"), button:has-text("Manage Subscription")',
    featureComparisonTable: 'table',
    currentPlanBadge: 'span:has-text("Premium")',
    currentUsage: 'h3:has-text("Current Usage"), h3:has-text("現在の使用状況")',
    licenseKeyInput:
      'input[placeholder*="ライセンスキー"], input[placeholder*="License key"]',
    activateButton:
      'button:has-text("アクティベート"), button:has-text("Activate")',
    deactivateButton: 'button:has-text("解除"), button:has-text("Deactivate")'
  },

  // Options - Help Tab
  help: {
    gettingStarted: 'h2:has-text("Getting Started"), h2:has-text("はじめに")',
    faq: 'h2:has-text("FAQ"), h2:has-text("よくある質問")',
    troubleshooting:
      'h2:has-text("Troubleshooting"), h2:has-text("トラブルシューティング")',
    passwordSection: 'h2:has-text("Password"), h2:has-text("パスワード")',
    setPasswordButton:
      'button:has-text("パスワードを設定"), button:has-text("Set Password")',
    changePasswordButton:
      'button:has-text("パスワードを変更"), button:has-text("Change Password")',
    removePasswordButton:
      'button:has-text("パスワードを削除"), button:has-text("Remove Password")',
    analyticsOptInToggle: '[role="switch"]',
    exportSettingsButton:
      'button:has-text("エクスポート"), button:has-text("Export Settings")',
    importSettingsButton:
      'button:has-text("選択"), button:has-text("Select File")',
    faqItem: 'details'
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
    // SHA-256("test1234")。以前は SHA-256("password") の値が
    // 誤って設定されており、パスワード認証のテストが常に失敗していた
    validHash:
      '937e8d5fbb48bd4949536cd65b8d35c426b80d2f830c5c308e2cdec422ae2244',
    invalid: 'wrong'
  }
};
