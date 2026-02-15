import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

import { useStorage } from '@plasmohq/storage/hook';

import { storage } from '~/lib/storage';
import { setCurrentLanguage } from '~/lib/i18n';
import type { AppSettings, VisionSettings } from '~/types/storage';
import { DEFAULT_SETTINGS, DEFAULT_VISION } from '~/types/storage';

interface SettingsContextValue {
  settings: AppSettings | undefined;
  setSettings: (settings: AppSettings | undefined) => void;
  vision: VisionSettings | undefined;
  setVision: (vision: VisionSettings | undefined) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);

interface SettingsProviderProps {
  children: ReactNode;
}

/**
 * Settings Context Provider
 * settings と vision を Context API で管理し、options.tsx の Props Drilling を解消する
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useStorage<AppSettings>(
    {
      key: 'settings',
      instance: storage
    },
    DEFAULT_SETTINGS
  );

  const [vision, setVision] = useStorage<VisionSettings>(
    {
      key: 'vision',
      instance: storage
    },
    DEFAULT_VISION
  );

  // Sync language setting with i18n module
  useEffect(() => {
    if (settings?.language !== undefined) {
      setCurrentLanguage(settings.language);
    }
  }, [settings?.language]);

  return (
    <SettingsContext.Provider
      value={{ settings, setSettings, vision, setVision }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Settings Context Hook
 * settings と vision にアクセスするためのカスタムフック
 */
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
