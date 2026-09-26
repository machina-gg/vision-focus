import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { useStorageItem } from '~/hooks';
import { settingsItem, visionItem } from '~/lib/storage';
import type { AppSettings, VisionSettings } from '~/types/storage';

/** 設定画面とポップアップで共有する、保存済みの設定とその更新関数 */
interface SettingsContextValue {
  /** アプリの設定（読み込むまでは既定値） */
  settings: AppSettings | undefined;
  /** アプリの設定を保存し、画面の値も更新する */
  setSettings: (settings: AppSettings | undefined) => void;
  /** 目標・表示の設定（読み込むまでは既定値） */
  vision: VisionSettings | undefined;
  /** 目標・表示の設定を保存し、画面の値も更新する */
  setVision: (vision: VisionSettings | undefined) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);

/** SettingsProvider の props */
interface SettingsProviderProps {
  /** 設定を使う子要素 */
  children: ReactNode;
}

/**
 * 保存済みの設定と目標・表示の設定を読み、子孫へ useSettings で渡す
 * @param props children に設定を使う子要素
 * @returns 子要素を包んだ Context の Provider
 */
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

/**
 * SettingsProvider が渡す設定とその更新関数を返す
 * @returns アプリの設定・目標と表示の設定と、それぞれの更新関数
 * @throws SettingsProvider の外で呼んだとき
 */
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
