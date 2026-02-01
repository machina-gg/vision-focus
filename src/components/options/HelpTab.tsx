import React, { useRef, useState } from 'react';
import {
  ExternalLink,
  MessageCircle,
  BookOpen,
  Mail,
  Download,
  Upload,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

import { Button, Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { exportSettings, importSettings } from '~/lib/settingsBackup';

const VERSION = '1.0.0';

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

export function HelpTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setFeedback(null);

    try {
      const result = await exportSettings();
      if (result.success) {
        setFeedback({
          type: 'success',
          message: getMessage('exportSuccess')
        });
      } else {
        setFeedback({
          type: 'error',
          message: getMessage('exportError', result.error || 'Unknown error')
        });
      }
    } finally {
      setIsExporting(false);
      // Clear feedback after 5 seconds
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setFeedback(null);

    try {
      const result = await importSettings(file);
      if (result.success && result.imported) {
        setFeedback({
          type: 'success',
          message: getMessage('importSuccess', [
            String(result.imported.blockList),
            String(result.imported.schedules),
            String(result.imported.presets)
          ])
        });
        // Reload the page to reflect imported settings
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setFeedback({
          type: 'error',
          message: getMessage('importError', result.error || 'Unknown error')
        });
      }
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Getting Started */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
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
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
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
            <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-blue-600">
              {getMessage('helpFaqWildcard')}
            </summary>
            <p className="mt-2 text-sm text-gray-600 pl-4">
              {getMessage('helpFaqWildcardAnswer')}
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-blue-600">
              {getMessage('helpFaqPause')}
            </summary>
            <p className="mt-2 text-sm text-gray-600 pl-4">
              {getMessage('helpFaqPauseAnswer')}
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-blue-600">
              {getMessage('helpFaqPresets')}
            </summary>
            <p className="mt-2 text-sm text-gray-600 pl-4">
              {getMessage('helpFaqPresetsAnswer')}
            </p>
          </details>
        </div>
      </Card>

      {/* Support */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-purple-600" />
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
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
            {getMessage('helpReportIssue')}
          </a>
          <p className="text-xs text-gray-400">
            {getMessage('helpComingSoon')}
          </p>
        </div>
      </Card>

      {/* Data Backup */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getMessage('dataBackup')}
            </h2>
            <p className="text-sm text-gray-500">
              {getMessage('dataBackupDescription')}
            </p>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm">{feedback.message}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {getMessage('exportSettings')}
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                {getMessage('exportSettingsDescription')}
              </p>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                size="sm"
                variant="secondary"
              >
                <Download className="w-4 h-4" />
                {isExporting
                  ? getMessage('exporting')
                  : getMessage('exportSettings')}
              </Button>
            </div>
          </div>

          {/* Import */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {getMessage('importSettings')}
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                {getMessage('importSettingsDescription')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                onClick={handleImportClick}
                disabled={isImporting}
                size="sm"
                variant="secondary"
              >
                <Upload className="w-4 h-4" />
                {isImporting
                  ? getMessage('importing')
                  : getMessage('selectFile')}
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">
                {getMessage('backupIncludes')}:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{getMessage('backupIncludesBlockList')}</li>
                <li>{getMessage('backupIncludesSchedules')}</li>
                <li>{getMessage('backupIncludesPresets')}</li>
              </ul>
              <p className="font-medium mt-2 mb-1">
                {getMessage('backupExcludes')}:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{getMessage('backupExcludesAnalytics')}</li>
                <li>{getMessage('backupExcludesPremium')}</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Version Info */}
      <div className="text-center text-xs text-gray-400">
        <p>VisionFocus v{VERSION}</p>
      </div>
    </div>
  );
}
