import React from 'react';

import { BarChart3 } from 'lucide-react';

import { Button } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

interface AnalyticsOptInModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export function AnalyticsOptInModal({
  isOpen,
  onAllow,
  onDeny
}: AnalyticsOptInModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative w-full mx-4 max-w-sm bg-white rounded-2xl shadow-xl">
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
            <Button variant="secondary" onClick={onDeny} className="flex-1">
              {getMessage('analyticsOptInDeny')}
            </Button>
            <Button variant="primary" onClick={onAllow} className="flex-1">
              {getMessage('analyticsOptInAllow')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
