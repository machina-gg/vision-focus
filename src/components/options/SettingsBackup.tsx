import React, { useState, useRef } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  Check,
  AlertTriangle
} from 'lucide-react';

import { Button, Card } from '~/components/ui';
import { ImportConfirmModal } from '~/components/options/modals';
import {
  EXPORT_STATUS_DELAY_MS,
  SHARE_MESSAGE_DELAY_MS
} from '~/constants/intervals';
import { getMessage } from '~/lib/i18n';
import { messageErrorText } from '~/lib/messageError';
import { sendMessage } from '~/lib/messaging';
import {
  exportSettings,
  downloadSettings,
  readFileAsString,
  validateImportedData
} from '~/lib/settingsExport';
import {
  getBackgroundImages,
  getSettings,
  getSites,
  getVision
} from '~/lib/storage';
import { MAX_PRESETS } from '~/constants/limits';
import type { ExportedData } from '~/types/messageSchemas';

/** SettingsBackup に渡すパスワード保護の状態 */
interface SettingsBackupProps {
  /** true なら取り込みの確認でパスワードを入力させる */
  isPasswordProtected: boolean;
}

interface PendingImport {
  data: ExportedData;
  warningKeys: string[];
}

/**
 * 設定を JSON ファイルに書き出す操作と、書き出したファイルで設定を置き換える操作をカードで表示する（取り込む前に必ず上書きの確認を出し、パスワード保護中は同じ確認でパスワードを入力させる。保存は background に任せ、画面は結果だけを出す。取り込んだ設定の表示は保存値の購読が追従する）
 * @param props パスワード保護の状態（各フィールドは SettingsBackupProps）
 * @returns バックアップのカード（結果・警告の表示と取り込みの確認モーダルを含む）
 */
export function SettingsBackup({ isPasswordProtected }: SettingsBackupProps) {
  const [exportStatus, setExportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [importStatus, setImportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [exportWarning, setExportWarning] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExportStatus('loading');
    setExportWarning(null);

    try {
      const [settings, vision, sites] = await Promise.all([
        getSettings(),
        getVision(),
        getSites()
      ]);
      const images = await getBackgroundImages(
        vision.presets.flatMap((preset) =>
          preset.customBackgroundId === null ? [] : [preset.customBackgroundId]
        )
      );
      const { data, isLarge } = exportSettings(settings, vision, sites, images);

      if (isLarge) {
        setExportWarning(getMessage('exportLargeWarning'));
      }

      downloadSettings(data);
      setExportStatus('success');

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

  const showImportError = (messageKey: string, substitutions?: string[]) => {
    setImportStatus('error');
    setImportMessage(getMessage(messageKey, substitutions));
    setTimeout(() => {
      setImportStatus('idle');
      setImportMessage(null);
      setImportWarnings([]);
    }, SHARE_MESSAGE_DELAY_MS);
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
        showImportError(
          result.error || 'importErrorInvalidFormat',
          result.errorSubstitutions
        );
        return;
      }

      if (!result.data) {
        throw new Error('No data');
      }

      setPendingImport({
        data: result.data,
        warningKeys: result.warnings ?? []
      });
    } catch {
      showImportError('importErrorInvalidFormat');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportConfirm = async (
    password?: string
  ): Promise<string | null> => {
    if (!pendingImport) return null;
    const { data, warningKeys } = pendingImport;

    try {
      // 保存・ブロックルールの更新・開いているタブのブロックを一続きで処理させるため、保存は background に任せる
      const response = await sendMessage('import-settings', {
        data,
        password
      });

      const code = response?.error?.code;
      if (code === 'password-required' || code === 'password-mismatch') {
        return messageErrorText(response?.error);
      }

      if (!response?.success) {
        showImportError('importErrorSaveFailed');
        return null;
      }

      const clearedKeys = [
        ...(response.clearedSchedulePresets
          ? ['importWarningOrphanedPresets']
          : []),
        ...(response.clearedActivePreset
          ? ['importWarningActivePresetNotFound']
          : [])
      ].filter((key) => !warningKeys.includes(key));
      const skippedPresets = response.skippedPresets ?? [];
      setImportWarnings([
        ...[...warningKeys, ...clearedKeys].map((key) => getMessage(key)),
        ...(skippedPresets.length > 0
          ? [
              getMessage('importWarningPresetLimit', [
                String(MAX_PRESETS),
                skippedPresets.join(', ')
              ])
            ]
          : [])
      ]);

      setImportStatus('success');
      setImportMessage(getMessage('importSuccess'));

      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage(null);
        setImportWarnings([]);
      }, SHARE_MESSAGE_DELAY_MS);
    } catch {
      showImportError('importErrorSaveFailed');
    }
    return null;
  };

  const handleImportClose = () => {
    setPendingImport(null);
    setImportStatus((status) => (status === 'loading' ? 'idle' : status));
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
              data-testid="settings-export-button"
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
                data-testid="settings-import-input"
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                data-testid="settings-import-button"
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
              <span data-testid="import-result-message">{importMessage}</span>
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

      <ImportConfirmModal
        isOpen={pendingImport !== null}
        onClose={handleImportClose}
        requiresPassword={isPasswordProtected}
        onConfirm={handleImportConfirm}
      />
    </Card>
  );
}
