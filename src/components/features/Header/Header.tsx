import React from 'react';

import { Settings, HelpCircle, ChevronDown } from 'lucide-react';

import iconBase64 from 'data-base64:assets/icon.png';

import { Toggle } from '~/components/ui';
import {
  getMessage,
  getSupportedLanguages,
  getCurrentLanguage
} from '~/lib/i18n';
import type { SupportedLanguage } from '~/types/storage';

const VERSION = '1.0.0';

export interface HeaderProps {
  showSettings?: boolean;
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  language?: SupportedLanguage | null;
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export function Header({
  showSettings = true,
  onSettingsClick,
  onHelpClick,
  paused = false,
  onPausedChange,
  language,
  onLanguageChange
}: HeaderProps) {
  const supportedLanguages = getSupportedLanguages();
  const currentLang = language ?? getCurrentLanguage();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      {/* Logo + Name + Version */}
      <div className="flex items-center gap-2">
        <img src={iconBase64} alt="VisionFocus" className="w-7 h-7" />
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
        {/* Language Selector */}
        {onLanguageChange && (
          <div className="relative">
            <select
              value={currentLang}
              onChange={(e) =>
                onLanguageChange(e.target.value as SupportedLanguage)
              }
              className="appearance-none bg-gray-50 border border-gray-200 rounded-md px-2 py-1 pr-6 text-xs text-gray-600 cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        )}

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
            />
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <button
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
