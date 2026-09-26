/** 設定画面のタブの名前（URL のハッシュにも使う） */
export const TABS = {
  /** ブロック対象の一覧 */
  BLOCKLIST: 'blocklist',
  /** 新しいタブの表示のスタイル */
  STYLES: 'styles',
  /** ブロックのスケジュール */
  SCHEDULES: 'schedules',
  /** 分析 */
  ANALYTICS: 'analytics',
  /** 拡張全体の設定 */
  SETTINGS: 'settings',
  /** ヘルプ */
  HELP: 'help'
} as const;

/** 設定画面のタブの名前のいずれか */
export type TabName = (typeof TABS)[keyof typeof TABS];

/** ハッシュが無い・タブの名前でないときに開くタブ */
export const DEFAULT_TAB: TabName = TABS.BLOCKLIST;

/**
 * 文字列が設定画面のタブの名前かを判定する
 * @param tab 判定する文字列（先頭の # は含めない）
 * @returns タブの名前なら true
 */
export function isValidTab(tab: string): tab is TabName {
  return Object.values(TABS).includes(tab as TabName);
}

/**
 * URL のハッシュから開くタブを決める
 * @param hash location.hash（先頭の # を含む）
 * @returns ハッシュが指すタブ。タブの名前でなければ DEFAULT_TAB
 */
export function getTabFromHash(hash: string): TabName {
  const tabName = hash.slice(1);
  return isValidTab(tabName) ? tabName : DEFAULT_TAB;
}
