import React, { useState, useRef } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  Check,
  AlertTriangle
} from 'lucide-react';

import { Button, Card } from '~/components/ui';
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

interface HelpSettingsBackupProps {
  onSettingsChange?: () => void;
}

/**
 * Settings Backup セクションコンポーネント
 * 設定のエクスポート・インポート機能を提供
 */
export function HelpSettingsBackup({
  onSettingsChange
}: HelpSettingsBackupProps) {
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
  );
}
