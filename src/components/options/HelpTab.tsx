import React from 'react';
import { ExternalLink, Mail } from 'lucide-react';

import { Card } from '~/components/ui';
import { SupportSection } from '~/components/features';
import { PasswordSettingsSection } from '~/components/options/PasswordSettingsSection';
import { HelpGettingStarted } from '~/components/options/HelpGettingStarted';
import { HelpFAQ } from '~/components/options/HelpFAQ';
import { HelpTroubleshooting } from '~/components/options/HelpTroubleshooting';
import { HelpDataPrivacy } from '~/components/options/HelpDataPrivacy';
import { HelpSettingsBackup } from '~/components/options/HelpSettingsBackup';
import { getMessage } from '~/lib/i18n';
import { useSettings } from '~/contexts/SettingsContext';
import type {
  PasswordSettings,
  AnalyticsOptIn,
  UnblockConfirmSettings
} from '~/types/storage';
import {
  DEFAULT_PASSWORD_SETTINGS,
  DEFAULT_UNBLOCK_CONFIRM_SETTINGS
} from '~/types/storage';

const VERSION = '1.0.0';

interface HelpTabProps {
  onSettingsChange?: () => void;
  onPasswordUpdate?: (settings: PasswordSettings) => Promise<void>;
  onUnblockConfirmUpdate?: (settings: UnblockConfirmSettings) => Promise<void>;
  onAnalyticsOptInChange?: (optIn: AnalyticsOptIn) => Promise<void>;
}

export function HelpTab({
  onSettingsChange,
  onPasswordUpdate,
  onUnblockConfirmUpdate,
  onAnalyticsOptInChange
}: HelpTabProps) {
  const { settings } = useSettings();
  return (
    <div className="space-y-6">
      {/* Getting Started */}
      <HelpGettingStarted />

      {/* FAQ */}
      <HelpFAQ />

      {/* Troubleshooting */}
      <HelpTroubleshooting />

      {/* Unblock Protection (hold duration + password) */}
      {onPasswordUpdate && onUnblockConfirmUpdate && (
        <PasswordSettingsSection
          passwordSettings={settings?.password ?? DEFAULT_PASSWORD_SETTINGS}
          onUpdate={onPasswordUpdate}
          holdSeconds={
            (settings?.unblockConfirm ?? DEFAULT_UNBLOCK_CONFIRM_SETTINGS)
              .holdSeconds
          }
          onUnblockConfirmUpdate={onUnblockConfirmUpdate}
        />
      )}

      {/* Data & Privacy */}
      {onAnalyticsOptInChange && (
        <HelpDataPrivacy
          settings={settings}
          onAnalyticsOptInChange={onAnalyticsOptInChange}
        />
      )}

      {/* Settings Backup */}
      <HelpSettingsBackup onSettingsChange={onSettingsChange} />

      {/* Support Development */}
      <SupportSection />

      {/* Support */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-premium-100 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-premium-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getMessage('helpSupport')}
            </h2>
            <p className="text-sm text-gray-500">
              {getMessage('helpSupportDescription')}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSf3yxG71Z4YQWkoZqBMFuUb0Zxvj0DQFS9FEODjUVDQSnzXhg/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-info-600 hover:text-info-800"
          >
            <ExternalLink className="w-4 h-4" />
            {getMessage('helpContactUs')}
          </a>
        </div>
      </Card>

      {/* Version Info */}
      <div className="text-center text-xs text-gray-400">
        <p>VisionFocus v{VERSION}</p>
      </div>
    </div>
  );
}
