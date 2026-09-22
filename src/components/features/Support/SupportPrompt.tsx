import React from 'react';
import { X } from 'lucide-react';

import { getMessage } from '~/lib/i18n';
import { SupportButton } from './SupportButton';

interface SupportPromptProps {
  /** 支援ページを開く */
  onSupport: () => Promise<void>;
  /** 誘導を閉じる */
  onDismiss: () => Promise<void>;
}

/**
 * レポートの下に控えめに出す支援誘導
 *
 * 出すかどうかは親が決める（この部品は渡された操作を伝えるだけ）。閉じるだけで
 * 機能の利用を妨げない。新規タブとブロック画面には置かない — 集中させる
 * 画面であり、外部リンクは離脱経路になるため。
 */
export function SupportPrompt({ onSupport, onDismiss }: SupportPromptProps) {
  return (
    <div
      data-testid="support-prompt"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-premium-200 bg-premium-50 px-4 py-3"
    >
      <p className="text-sm text-gray-700">{getMessage('supportPromptBody')}</p>
      <div className="flex items-center gap-2">
        <SupportButton onClick={() => void onSupport()} size="sm" />
        <button
          type="button"
          data-testid="support-prompt-dismiss"
          aria-label={getMessage('supportPromptDismiss')}
          onClick={() => void onDismiss()}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-premium-100 focus:outline-none focus:ring-2 focus:ring-premium-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
