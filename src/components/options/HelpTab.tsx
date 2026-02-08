import React, { useState, useRef } from 'react';
import {
  ExternalLink,
  MessageCircle,
  BookOpen,
  Mail,
  Download,
  Upload,
  HardDrive,
  Check,
  AlertTriangle,
  BarChart3
} from 'lucide-react';

import { Button, Card, Toggle } from '~/components/ui';
import { PasswordSettingsSection } from '~/components/options/PasswordSettingsSection';
import {
  EXPORT_STATUS_DELAY_MS,
  SHARE_MESSAGE_DELAY_MS
} from '~/constants/intervals';
import { getMessage } from '~/lib/i18n';
import {
  exportSettings,
  downloadSettings,
  readFileAsString,
  validateImportedData,
  applyImportedSettings
} from '~/lib/settingsExport';
import { getSettings, getVision, setSettings, setVision } from '~/lib/storage';
import type {
  PasswordSettings,
  AppSettings,
  AnalyticsOptIn
} from '~/types/storage';
import { DEFAULT_PASSWORD_SETTINGS } from '~/types/storage';

const VERSION = '1.0.0';

interface HelpTabProps {
  onSettingsChange?: () => void;
  settings?: AppSettings;
  onPasswordUpdate?: (settings: PasswordSettings) => Promise<void>;
  onAnalyticsOptInChange?: (optIn: AnalyticsOptIn) => Promise<void>;
}

export function HelpTab({
  onSettingsChange,
  settings,
  onPasswordUpdate,
  onAnalyticsOptInChange
}: HelpTabProps) {
  const [exportStatus, setExportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [importStatus, setImportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [exportWarning, setExportWarning] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExportStatus('loading');
    setExportWarning(null);

    try {
      const [settings, vision] = await Promise.all([
        getSettings(),
        getVision()
      ]);
      const { data, isLarge } = exportSettings(settings, vision);

      if (isLarge) {
        setExportWarning(getMessage('exportLargeWarning'));
      }

      downloadSettings(data);
      setExportStatus('success');

      // Reset status after a short delay
      setTimeout(() => {
        setExportStatus('idle');
        setExportWarning(null);
      }, EXPORT_STATUS_DELAY_MS);
    } catch {
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), EXPORT_STATUS_DELAY_MS);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    setImportMessage(null);
    setImportWarnings([]);

    try {
      const content = await readFileAsString(file);
      const result = validateImportedData(content);

      if (!result.success) {
        setImportStatus('error');
        setImportMessage(
          getMessage(result.error || 'importErrorInvalidFormat')
        );
        setTimeout(() => {
          setImportStatus('idle');
          setImportMessage(null);
        }, SHARE_MESSAGE_DELAY_MS);
        return;
      }

      if (result.warnings) {
        setImportWarnings(result.warnings.map((w) => getMessage(w)));
      }

      // Apply imported settings
      if (!result.data) {
        throw new Error('No data');
      }

      const [currentSettings, currentVision] = await Promise.all([
        getSettings(),
        getVision()
      ]);

      const { settings: newSettings, vision: newVision } =
        applyImportedSettings(result.data, currentSettings, currentVision);

      await Promise.all([setSettings(newSettings), setVision(newVision)]);

      setImportStatus('success');
      setImportMessage(getMessage('importSuccessWithMerge'));

      // Notify parent of settings change
      onSettingsChange?.();

      // Reset status after a short delay
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage(null);
        setImportWarnings([]);
      }, SHARE_MESSAGE_DELAY_MS);
    } catch {
      setImportStatus('error');
      setImportMessage(getMessage('importErrorInvalidFormat'));
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage(null);
      }, SHARE_MESSAGE_DELAY_MS);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Getting Started */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-info-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getMessage('helpGettingStarted')}
            </h2>
            <p className="text-sm text-gray-500">
              {getMessage('helpGettingStartedDescription')}
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-800 mb-1">
              {getMessage('helpBlockSites')}
            </h3>
            <p>{getMessage('helpBlockSitesDescription')}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-1">
              {getMessage('helpSchedules')}
            </h3>
            <p>{getMessage('helpSchedulesDescription')}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-1">
              {getMessage('helpDashboard')}
            </h3>
            <p>{getMessage('helpDashboardDescription')}</p>
          </div>
        </div>
      </Card>

      {/* FAQ */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getMessage('helpFaq')}
            </h2>
            <p className="text-sm text-gray-500">
              {getMessage('helpFaqDescription')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-info-600">
              {getMessage('helpFaqWildcard')}
            </summary>
            <p className="mt-2 text-sm text-gray-600 pl-4">
              {getMessage('helpFaqWildcardAnswer')}
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-info-600">
              {getMessage('helpFaqPause')}
            </summary>
            <p className="mt-2 text-sm text-gray-600 pl-4">
              {getMessage('helpFaqPauseAnswer')}
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-info-600">
              {getMessage('helpFaqPresets')}
            </summary>
            <p className="mt-2 text-sm text-gray-600 pl-4">
              {getMessage('helpFaqPresetsAnswer')}
            </p>
          </details>
        </div>
      </Card>

      {/* Password Protection */}
      {onPasswordUpdate && (
        <PasswordSettingsSection
          passwordSettings={settings?.password ?? DEFAULT_PASSWORD_SETTINGS}
          onUpdate={onPasswordUpdate}
        />
      )}

      {/* Data & Privacy */}
      {onAnalyticsOptInChange && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getMessage('analyticsPrivacyTitle')}
              </h2>
              <p className="text-sm text-gray-500">
                {getMessage('analyticsPrivacyDescription')}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <h3 className="font-medium text-gray-800 mb-1">
                  {getMessage('analyticsShareStats')}
                </h3>
                <p className="text-sm text-gray-600">
                  {getMessage('analyticsShareStatsDescription')}
                </p>
              </div>
              <Toggle
                checked={settings?.analyticsOptIn?.enabled === true}
                onChange={(checked) =>
                  onAnalyticsOptInChange({
                    enabled: checked,
                    decidedAt: new Date().toISOString()
                  })
                }
                size="sm"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Settings Backup */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-warning-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getMessage('settingsBackup')}
            </h2>
            <p className="text-sm text-gray-500">
              {getMessage('settingsBackupDescription')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Export Section */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <Download className="w-4 h-4 text-gray-600" />
                  {getMessage('exportSettings')}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {getMessage('exportSettingsDescription')}
                </p>
                <p className="text-xs text-gray-500">
                  {getMessage('settingsIncluded')}
                </p>
                <p className="text-xs text-gray-400">
                  {getMessage('settingsNotIncluded')}
                </p>
              </div>
              <Button
                onClick={handleExport}
                disabled={exportStatus === 'loading'}
                size="sm"
                variant={exportStatus === 'success' ? 'secondary' : 'primary'}
              >
                {exportStatus === 'loading' ? (
                  getMessage('processing')
                ) : exportStatus === 'success' ? (
                  <>
                    <Check className="w-4 h-4" />
                    {getMessage('saved')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {getMessage('exportSettings')}
                  </>
                )}
              </Button>
            </div>
            {exportWarning && (
              <div className="mt-3 flex items-center gap-2 text-xs text-warning-600 bg-warning-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{exportWarning}</span>
              </div>
            )}
          </div>

          {/* Import Section */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-gray-600" />
                  {getMessage('importSettings')}
                </h3>
                <p className="text-sm text-gray-600">
                  {getMessage('importSettingsDescription')}
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={handleImportClick}
                  disabled={importStatus === 'loading'}
                  size="sm"
                  variant={importStatus === 'success' ? 'secondary' : 'primary'}
                >
                  {importStatus === 'loading' ? (
                    getMessage('processing')
                  ) : importStatus === 'success' ? (
                    <>
                      <Check className="w-4 h-4" />
                      {getMessage('saved')}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {getMessage('selectFile')}
                    </>
                  )}
                </Button>
              </div>
            </div>
            {importMessage && (
              <div
                className={`mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                  importStatus === 'success'
                    ? 'text-success-600 bg-success-50'
                    : 'text-danger-600 bg-danger-50'
                }`}
              >
                {importStatus === 'success' ? (
                  <Check className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{importMessage}</span>
              </div>
            )}
            {importWarnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {importWarnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-warning-600 bg-warning-50 px-3 py-2 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

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
            href="https://github.com/user/vision-focus/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-info-600 hover:text-info-800"
          >
            <ExternalLink className="w-4 h-4" />
            {getMessage('helpReportIssue')}
          </a>
          <p className="text-xs text-gray-400">
            {getMessage('helpComingSoon')}
          </p>
        </div>
      </Card>

      {/* Version Info */}
      <div className="text-center text-xs text-gray-400">
        <p>VisionFocus v{VERSION}</p>
      </div>
    </div>
  );
}
