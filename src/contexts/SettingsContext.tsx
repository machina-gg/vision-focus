import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { useStorageItem } from '~/hooks';
import { settingsItem, visionItem } from '~/lib/storage';
import type { AppSettings, VisionSettings } from '~/types/storage';

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

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useStorageItem(settingsItem);
  const [vision, setVision] = useStorageItem(visionItem);

  return (
    <SettingsContext.Provider
      value={{ settings, setSettings, vision, setVision }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
