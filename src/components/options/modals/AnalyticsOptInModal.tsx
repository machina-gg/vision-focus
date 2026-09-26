import React from 'react';

import { BarChart3 } from 'lucide-react';

import { Button } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { useSettings } from '~/contexts/SettingsContext';

/** AnalyticsOptInModal に渡す選択の受け取り先 */
interface AnalyticsOptInModalProps {
  /** 共有を許可するボタンが押されたときに呼ぶ */
  onAllow: () => void;
  /** 共有しないボタンが押されたときに呼ぶ */
  onDeny: () => void;
}

/**
 * 匿名の利用統計を共有するかを尋ねるダイアログを、まだ選んでいない間だけ表示する（選んだかは設定のコンテキストから読む）
 * @param props 選択の受け取り先（各フィールドは AnalyticsOptInModalProps）
 * @returns 共有の確認ダイアログ。選択済みなら null
 */
export function AnalyticsOptInModal({
  onAllow,
  onDeny
}: AnalyticsOptInModalProps) {
  const { settings } = useSettings();

  const isOpen =
    settings?.analyticsOptIn === undefined || settings?.analyticsOptIn === null;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="analytics-optin-modal"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full mx-4 max-w-sm bg-white rounded-2xl shadow-xl"
      >
        <div className="px-6 py-6 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {getMessage('analyticsOptInTitle')}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {getMessage('analyticsOptInDescription')}
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onDeny}
              className="flex-1"
              data-testid="analytics-optin-deny"
            >
              {getMessage('analyticsOptInDeny')}
            </Button>
            <Button
              variant="primary"
              onClick={onAllow}
              className="flex-1"
              data-testid="analytics-optin-allow"
            >
              {getMessage('analyticsOptInAllow')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
