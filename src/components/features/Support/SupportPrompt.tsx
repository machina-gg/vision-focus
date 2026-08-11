import React from 'react';
import { X } from 'lucide-react';

import { getMessage } from '~/lib/i18n';
import { useSupportPrompt } from '~/hooks/useSupportPrompt';
import { SupportButton } from './SupportButton';

/**
 * レポートの下に控えめに出す支援誘導
 *
 * 表示は 30 日に 1 回まで（`useSupportPrompt` が制御）。閉じるだけで
 * 機能の利用を妨げない。新規タブとブロック画面には置かない — 集中させる
 * 画面であり、外部リンクは離脱経路になるため。
 */
export function SupportPrompt() {
  const { isVisible, handleSupport, handleDismiss } = useSupportPrompt();

  if (!isVisible) return null;

  return (
    <div
      data-testid="support-prompt"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-premium-200 bg-premium-50 px-4 py-3"
    >
      <p className="text-sm text-gray-700">{getMessage('supportPromptBody')}</p>
      <div className="flex items-center gap-2">
        <SupportButton onClick={() => void handleSupport()} size="sm" />
        <button
          type="button"
          data-testid="support-prompt-dismiss"
          aria-label={getMessage('supportPromptDismiss')}
          onClick={() => void handleDismiss()}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-premium-100 focus:outline-none focus:ring-2 focus:ring-premium-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
