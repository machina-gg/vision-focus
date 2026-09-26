import React from 'react';
import { X } from 'lucide-react';

import { getMessage } from '~/lib/i18n';
import { SupportButton } from './SupportButton';

/** SupportPrompt に渡す支援と閉じる操作 */
interface SupportPromptProps {
  /** 支援ボタンが押されたときに呼ぶ（完了は待たない） */
  onSupport: () => Promise<void>;
  /** 閉じるボタンが押されたときに呼ぶ（完了は待たない） */
  onDismiss: () => Promise<void>;
}

/**
 * 支援を呼びかける文言と、支援ボタン・閉じるボタンを帯で表示する
 * @param props 支援と閉じる操作（各フィールドは SupportPromptProps）
 * @returns 支援の呼びかけの帯
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
