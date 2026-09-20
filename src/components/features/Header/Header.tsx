import React from 'react';

import { Settings, HelpCircle } from 'lucide-react';

// アイコンはバンドルに含めるため ?inline（データ URL）で import する。
// html2canvas によるキャプチャ対象に入るため、外部 URL ではなくデータ URL の方が安全
import iconBase64 from '~/assets/icon.png?inline';

import { Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

const VERSION = '1.0.0';

export interface HeaderProps {
  showSettings?: boolean;
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
}

export function Header({
  showSettings = true,
  onSettingsClick,
  onHelpClick,
  paused = false,
  onPausedChange
}: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b border-gray-100"
      data-testid="app-header"
    >
      {/* Logo + Name + Version */}
      <div className="flex items-center gap-2">
        <img
          src={iconBase64}
          alt="VisionFocus"
          className="w-7 h-7"
          data-testid="app-logo"
        />
        <div className="flex flex-col">
          <span className="font-semibold text-gray-800 text-sm leading-tight">
            VisionFocus
          </span>
          <span className="text-[10px] text-gray-400 leading-tight">
            v{VERSION}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Block Toggle */}
        {onPausedChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">
              {getMessage(paused ? 'disabled' : 'active')}
            </span>
            <Toggle
              checked={!paused}
              onChange={(checked) => onPausedChange(!checked)}
              size="sm"
              data-testid="pause-toggle"
            />
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <button
            data-testid="settings-button"
            onClick={onSettingsClick}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            title={getMessage('settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Help */}
        {onHelpClick && (
          <button
            data-testid="help-button"
            onClick={onHelpClick}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            title={getMessage('help')}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
