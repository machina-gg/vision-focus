import React from 'react';
import { Coffee } from 'lucide-react';

import { getMessage } from '~/lib/i18n';
import { BUY_ME_A_COFFEE_BRAND_COLOR } from '~/constants';

export interface SupportButtonProps {
  onClick: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Buy Me a Coffee の支援ボタン
 *
 * 公式のウィジェット JS や外部ホストの画像は読み込まない。Manifest V3 は
 * リモートコードの実行を禁止しており、外部画像もネットワークアクセスに
 * なるため、ブランドカラーとアイコンで同等の見た目を自前で構成する。
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
      onClick={onClick}
      style={{ backgroundColor: BUY_ME_A_COFFEE_BRAND_COLOR }}
      className={`inline-flex items-center gap-2 rounded-lg font-semibold text-gray-900 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-premium-500 ${sizeStyles} ${className}`}
    >
      <Coffee className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      {getMessage('supportButtonLabel')}
    </button>
  );
}
