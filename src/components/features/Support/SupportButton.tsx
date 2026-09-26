import React from 'react';
import { Coffee } from 'lucide-react';

import { getMessage } from '~/lib/i18n';
import { BUY_ME_A_COFFEE_BRAND_COLOR } from '~/constants';

/** SupportButton に渡す押したときの処理と見た目 */
export interface SupportButtonProps {
  /** ボタンが押されたときに呼ぶ */
  onClick: () => void;
  /** ボタンの大きさ（省略時は 'md'） */
  size?: 'sm' | 'md';
  /** button 要素に足すクラス */
  className?: string;
}

// 公式のウィジェット JS や外部画像は読み込まない（MV3 はリモートコードの実行を禁じ、外部画像はネットワークアクセスになる）
/**
 * Buy Me a Coffee のブランド色で支援を呼びかけるボタンを表示する
 * @param props 押したときの処理と見た目（各フィールドは SupportButtonProps）
 * @returns button 要素
 */
export function SupportButton({
  onClick,
  size = 'md',
  className = ''
}: SupportButtonProps) {
  const sizeStyles = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2';

  return (
    <button
      type="button"
      data-testid="support-button"
      data-size={size}
      onClick={onClick}
      style={{ backgroundColor: BUY_ME_A_COFFEE_BRAND_COLOR }}
      className={`inline-flex items-center gap-2 rounded-lg font-semibold text-gray-900 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-premium-500 ${sizeStyles} ${className}`}
    >
      <Coffee className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      {getMessage('supportButtonLabel')}
    </button>
  );
}
