/**
 * 開発支援（投げ銭）に関する定数
 *
 * VisionFocus は全機能を無料で提供する。収益経路は投げ銭と書籍の
 * アフィリエイト推薦のみで、機能制限による課金は行わない。
 * 詳細は docs/PRD.md のマネタイズセクションを参照。
 */

/** Buy Me a Coffee の支援ページ URL */
export const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/machina.gg';

/** Buy Me a Coffee のブランドカラー（公式ボタンの背景色） */
export const BUY_ME_A_COFFEE_BRAND_COLOR = '#FFDD00';

/**
 * レポート下の支援誘導を閉じたあと、再表示しない期間（ms）
 *
 * 毎回出すと邪魔になるため間隔を空ける。支援ページを開いた場合は
 * 期間に関係なく再表示しない（`supportPrompt.ts` を参照）。
 */
export const SUPPORT_PROMPT_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
