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
    pauseToggle: '[data-testid="pause-toggle"]'
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

  // 分析画面への導線
  analyticsEntry: {
    analyticsLink: '[data-testid="view-analytics-link"]'
  },

  // Modals（Modal コンポーネントは role="dialog" を持つ）
  modal: {
    analyticsOptIn: '[data-testid="analytics-optin-modal"]',
    analyticsOptInAllow: '[data-testid="analytics-optin-allow"]',
    analyticsOptInDeny: '[data-testid="analytics-optin-deny"]',
    passwordModal: '[role="dialog"]',
    unblockConfirm: '[role="dialog"]',
    unblockConfirmHoldButton: '[data-testid="unblock-confirm-hold-button"]',
    unblockConfirmCancel: '[data-testid="unblock-confirm-cancel"]',
    passwordConfirmButton: '[data-testid="password-modal-confirm"]',
    passwordCancelButton: '[data-testid="password-modal-cancel"]'
  },

  // NewTab
  newtab: {
    container: '[data-testid="newtab-container"]',
    overlay: '[data-testid="newtab-overlay"]',
    goalText: '[data-testid="newtab-goal-text"]',
    goalInput: '[data-testid="newtab-goal-input"]',
    goalEditButton: '[data-testid="newtab-goal-edit-button"]',
    goalSaveButton: '[data-testid="newtab-goal-save"]',
    goalCancelButton: '[data-testid="newtab-goal-cancel"]',
    blockInfo: '[data-testid="newtab-block-info"]',
    blockInfoMessage: '[data-testid="newtab-block-info-message"]',
    blockedSitesToggle: '[data-testid="newtab-blocked-sites-toggle"]',
    blockedSiteDomain: '[data-testid="newtab-blocked-site-domain"]',
    miniStats: {
      blockCount: '[data-testid="newtab-block-count"]',
      blockingDays: '[data-testid="newtab-blocking-days"]'
    },
    setupCta: '[data-testid="newtab-setup-cta"]',
    downloadButton: '[data-testid="newtab-download-button"]',
    settingsButton: '[data-testid="newtab-settings-button"]'
  },

  // Options（共通）
  options: {
    header: '[data-testid="options-header"]',
    title: '[data-testid="options-title"]',
    tabsNav: 'nav[aria-label="Tabs"]',
    tabs: '[role="tablist"]',
    // タブは TABS 定数（src/constants/tabs.ts）の id で識別する
    blocklistTab: '[data-testid="tab-blocklist"]',
    stylesTab: '[data-testid="tab-styles"]',
    schedulesTab: '[data-testid="tab-schedules"]',
    analyticsTab: '[data-testid="tab-analytics"]',
    helpTab: '[data-testid="tab-help"]',
    domainInput: '[data-testid="blocklist-domain-input"]',
    addButton: '[data-testid="blocklist-add-button"]',
    listItem: '[data-testid="blocklist-item"]',
    itemDomain: '[data-testid="blocklist-item-domain"]',
    itemToggle: '[data-testid="blocklist-item-toggle"]',
    deleteButton: '[data-testid="blocklist-item-remove"]',
    toggle: '[role="switch"]',
    youtubeSection: 'text=/YouTube/i',
    notificationSection: 'text=/Notification|通知/i'
  },

  // Options - Styles Tab
  styles: {
    presetSelector: '[data-testid="styles-section-heading"]',
    createPresetButton: '[data-testid="style-new-preset-button"]',
    createFirstPresetButton: '[data-testid="style-create-first-button"]',
    presetButton: '[data-testid="style-preset-button"]',
    presetNameInput: '[data-testid="style-preset-name-input"]',
    goalTextInput: '[data-testid="style-goal-input"]',
    goalSubTextArea: '[data-testid="style-goal-subtext"]',
    textColorPicker: '[data-testid="style-text-color-picker"]',
    backgroundTypeImage: '[data-testid="style-bg-type-image"]',
    backgroundTypeColor: '[data-testid="style-bg-type-color"]',
    backgroundImageOption: '[data-testid="style-bg-option"]',
    backgroundColorPicker: '[data-testid="style-text-color-picker"]',
    // ファイル入力は hidden。可視要素はドロップゾーン
    customBackgroundUpload: '[data-testid="style-bg-upload"]',
    customBackgroundDropzone: '[data-testid="style-bg-upload-dropzone"]',
    // フォントは select ではなくボタン群で選択する
    fontCategoryButton: '[data-testid="font-category-button"]',
    fontFamilySelect: '[data-testid="font-family-button"]',
    fontSizeButton: '[data-testid="font-size-button"]',
    fontWeightButton: '[data-testid="font-weight-button"]',
    saveButton: '[data-testid="style-save-button"]',
    applyButton: '[data-testid="style-apply-button"]',
    deleteButton: '[data-testid="style-delete-button"]',
    preview: '[data-testid="style-preview"]',
    newPresetNameInput: '[data-testid="new-preset-name-input"]',
    newPresetConfirm: '[data-testid="new-preset-confirm"]',
    newPresetCancel: '[data-testid="new-preset-cancel"]',
    // スタイル削除の確認モーダル（参照しているスケジュールがあるときだけ開く）
    deletePresetModal: '[role="dialog"]',
    deletePresetScheduleCount: '[data-testid="delete-preset-schedule-count"]',
    deletePresetConfirm: '[data-testid="delete-preset-confirm"]',
    deletePresetCancel: '[data-testid="delete-preset-cancel"]'
  },

  // Options - Schedules Tab
  schedules: {
    weeklyCalendar: '[data-testid="weekly-calendar"]',
    weeklyCalendarDayHeader: '[data-testid="weekly-calendar-day-header"]',
    addScheduleButton: '[data-testid="schedule-add-button"]',
    scheduleItem: '[data-testid="schedule-item"]',
    scheduleItemPreset: '[data-testid="schedule-item-preset"]',
    scheduleToggle: '[data-testid="schedule-item-toggle"]',
    editButton: '[data-testid="schedule-item-edit"]',
    deleteButton: '[data-testid="schedule-item-delete"]',
    scheduleModal: '[role="dialog"]',
    scheduleNameInput: '[data-testid="schedule-name-input"]',
    startTimeInput: '[data-testid="schedule-start-time"]',
    endTimeInput: '[data-testid="schedule-end-time"]',
    // 曜日は checkbox ではなくトグルボタン
    dayCheckbox: '[data-testid="schedule-day-button"]',
    presetSelect: '[data-testid="schedule-preset-select"]',
    saveScheduleButton: '[data-testid="schedule-save-button"]',
    cancelScheduleButton: '[data-testid="schedule-cancel-button"]',
    scheduleError: '[data-testid="schedule-error"]',
    noSchedules: 'text=/スケジュールがありません|No schedules/i'
  },

  // Options - Analytics Tab
  analytics: {
    siteRankingList: '[data-testid="analytics-top-sites-heading"]',
    trackedSitesList: '[data-testid="analytics-tracked-sites-heading"]',
    unblockHistory: '[data-testid="analytics-tracked-sites-heading"]',
    wastedTimeSection: '[data-testid="analytics-tracked-sites-heading"]',
    exportButton: '[data-testid="analytics-export-button"]',
    exportBlocklist: '[data-testid="analytics-export-blocklist"]',
    exportBlockCounts: '[data-testid="analytics-export-block-counts"]',
    exportDailyStats: '[data-testid="analytics-export-daily-stats"]',
    exportUnblocked: '[data-testid="analytics-export-unblocked"]',
    refreshButton: '[data-testid="analytics-refresh-button"]',
    resetButton: '[data-testid="analytics-reset-button"]',
    resetConfirmButton: '[data-testid="analytics-reset-confirm"]',
    reblockButton: '[data-testid="analytics-reblock-button"]',
    stopTrackingButton: '[data-testid="analytics-stop-tracking-button"]',
    addSiteInput: '[data-testid="analytics-add-site-input"]',
    addSiteButton: '[data-testid="analytics-add-site-button"]'
  },

  // Options - Help Tab
  help: {
    gettingStarted: '[data-testid="help-getting-started"]',
    faq: '[data-testid="help-faq"]',
    troubleshooting: '[data-testid="help-troubleshooting"]',
    passwordSection: '[data-testid="help-password-section"]',
    unblockProtectionSection: '[data-testid="help-unblock-protection-section"]',
    // 共通の Select は目印を受け取らないため、枠の目印から select を指す
    unblockHoldSecondsSelect:
      '[data-testid="unblock-hold-seconds-field"] select',
    // パスワード保護はボタンではなくトグルで有効化する
    passwordEnableToggle: '[data-testid="password-enable-toggle"]',
    // パスワード欄の目印は欄ごとに別の値になっている。数・表示の確認は前方一致で
    // まとめて指し、入力は下の 3 つで欄を名指しする（machina-gg/vision-focus#468）
    passwordField: '[data-testid^="password-field-"]',
    passwordFieldCurrent: '[data-testid="password-field-current"]',
    passwordFieldNew: '[data-testid="password-field-new"]',
    passwordFieldConfirm: '[data-testid="password-field-confirm"]',
    passwordChangeButton: '[data-testid="password-change-button"]',
    passwordFormSubmit: '[data-testid="password-form-submit"]',
    passwordFormCancel: '[data-testid="password-form-cancel"]',
    analyticsOptInToggle: '[data-testid="analytics-optin-toggle"]',
    exportSettingsButton: '[data-testid="settings-export-button"]',
    importSettingsButton: '[data-testid="settings-import-button"]',
    importSettingsInput: '[data-testid="settings-import-input"]',
    importResultMessage: '[data-testid="import-result-message"]',
    faqItem: '[data-testid="help-faq-item"]'
  }
};

/**
 * 画面に出る文言（英語）
 *
 * data-testid を持たない要素は文言で指すしかない。文言は実装（`getMessage` が
 * 引く `public/_locales/en/messages.json`、FontPicker はコード内の定数）と
 * 一致させる必要があるため、テストごとに直書きせずここへ集める。
 * テストは既定のブラウザ言語で走るので、拡張機能は default_locale の en で表示される。
 */
export const UI_TEXT = {
  common: {
    save: 'Save'
  },
  // $COUNT$ のような置換を含む文言は、置換後の文字列を組み立てる関数で持つ
  // （messages.json の message をそのまま書くと `$COUNT$` が残り、画面の
  //   表示と一致しない）
  blockCount: {
    /** ブロックリストとサイト別ランキングのバッジ（blockedTimesShort） */
    short: (count: number) => `${count} blocks`,
    /** newtab のブロック情報バナー（blockedTimes） */
    long: (count: number) => `You've blocked this site ${count} times`
  },
  // newtab のミニ統計カード（blockedForDays）。単位が付くため数値だけの
  // 一致にしない
  blockingDays: (count: number) => `${count} days`,
  newtab: {
    download: 'Download',
    downloadWallpaper: 'Download Wallpaper'
  },
  styles: {
    // 選択中のプリセットが適用済みなら Active の表示、未適用なら Apply ボタン
    activePreset: 'Active',
    applyPreset: 'Apply'
  },
  schedules: {
    // 保存時に既存と時間帯が重なっていたときのエラー（scheduleOverlapError）
    overlapError: 'This time range overlaps with an existing schedule.'
  },
  help: {
    // 「はじめに」に並ぶ手順の見出し（HelpGettingStarted）。
    // ⚠ ここに無い手順が増えても検査は落ちない（存在の確認だけを行う）
    gettingStartedSteps: [
      'Block Distracting Sites',
      'Set Up Schedules',
      'Customize Your Dashboard',
      'Set Time Limits',
      'Track Your Progress'
    ]
  },
  timeLimit: {
    // 時間制限の編集欄の開閉ボタンは、未設定なら現在の設定として
    // 「Always Blocked」を表示する（"Time Limit" という文言のボタンは無い）
    alwaysBlocked: 'Always Blocked'
  },
  youtube: {
    enable: 'Enable YouTube blocking',
    blockAccess: 'Block access to YouTube',
    hideShorts: 'Hide Shorts',
    hideRecommendations: 'Hide Recommendations',
    hideComments: 'Hide Comments',
    timeLimitSettings: 'Time Limit Settings'
  },
  notifications: {
    heading: 'Notification Settings',
    minutesLabel: 'Notify before limit'
  },
  font: {
    sizeSmall: 'Small',
    sizeLarge: 'Large'
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
