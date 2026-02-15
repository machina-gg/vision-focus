import React from 'react';
import { ExternalLink, Mail, Globe } from 'lucide-react';

import { Card } from '~/components/ui';
import { PasswordSettingsSection } from '~/components/options/PasswordSettingsSection';
import { HelpGettingStarted } from '~/components/options/HelpGettingStarted';
import { HelpFAQ } from '~/components/options/HelpFAQ';
import { HelpTroubleshooting } from '~/components/options/HelpTroubleshooting';
import { HelpDataPrivacy } from '~/components/options/HelpDataPrivacy';
import { HelpSettingsBackup } from '~/components/options/HelpSettingsBackup';
import { getMessage, getSupportedLanguages } from '~/lib/i18n';
import type {
  PasswordSettings,
  AppSettings,
  AnalyticsOptIn,
  SupportedLanguage
} from '~/types/storage';
import { DEFAULT_PASSWORD_SETTINGS } from '~/types/storage';

const VERSION = '1.0.0';

interface HelpTabProps {
  onSettingsChange?: () => void;
  settings?: AppSettings;
  onPasswordUpdate?: (settings: PasswordSettings) => Promise<void>;
  onAnalyticsOptInChange?: (optIn: AnalyticsOptIn) => Promise<void>;
  onLanguageChange?: (language: SupportedLanguage | null) => Promise<void>;
}

export function HelpTab({
  onSettingsChange,
  settings,
  onPasswordUpdate,
  onAnalyticsOptInChange,
  onLanguageChange
}: HelpTabProps) {
  return (
    <div className="space-y-6">
      {/* Getting Started */}
      <HelpGettingStarted />

      {/* FAQ */}
      <HelpFAQ />

      {/* Troubleshooting */}
      <HelpTroubleshooting />

      {/* Language Settings */}
      {onLanguageChange && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-info-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getMessage('languageSettingsTitle')}
              </h2>
              <p className="text-sm text-gray-500">
                {getMessage('languageSettingsDescription')}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">
                  {getMessage('languageLabel')}
                </span>
                <select
                  value={settings?.language ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    onLanguageChange(
                      value === '' ? null : (value as SupportedLanguage)
                    );
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">
                    {getMessage('languageSelectDescription')}
                  </option>
                  {getSupportedLanguages().map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Password Protection */}
      {onPasswordUpdate && (
        <PasswordSettingsSection
          passwordSettings={settings?.password ?? DEFAULT_PASSWORD_SETTINGS}
          onUpdate={onPasswordUpdate}
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
