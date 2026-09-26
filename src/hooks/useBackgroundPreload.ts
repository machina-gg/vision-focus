import React, { useEffect, useMemo, useState } from 'react';

import {
  getBackgroundUrl,
  loadGoogleFont,
  FONT_WEIGHT_VALUE
} from '~/constants';
import { STORAGE_LOADED_TIMEOUT_MS } from '~/constants/intervals';
import { hasStoredVision } from '~/lib/storage';
import type { DashboardDisplaySettings } from '~/types/storage';
import { getFontDefinition } from '~/types/font';

const FONT_SIZE_PX: Record<string, number> = {
  sm: 30,
  md: 36,
  lg: 48,
  xl: 60
};

interface UseBackgroundPreloadOptions {
  /** 今表示する表示設定 */
  displaySettings: DashboardDisplaySettings;
}

interface UseBackgroundPreloadReturn {
  /** 保存済みの表示設定を読めたか（保存値が無くても一定時間で true になる） */
  isStorageLoaded: boolean;
  /** 背景を出せる状態か（画像は読み込みが終わるか失敗したら true。単色なら最初から true） */
  isBackgroundReady: boolean;
  /** 単色の背景を使うか */
  isColorBackground: boolean;
  /** 背景画像の URL（利用者の画像 > 同梱の画像 > 既定の画像） */
  backgroundUrl: string;
  /** 単色の背景の CSS の色の値 */
  backgroundColor: string;
  /** 背景を描く要素のスタイル（画像の読み込み中は仮の単色） */
  containerStyle: React.CSSProperties;
  /** 目標文のフォントのスタイル */
  fontStyle: React.CSSProperties;
}

/**
 * ダッシュボードの背景画像とフォントを先読みし、表示してよいかの状態と適用するスタイルを返す
 * @param options フックの入力（下記の項目）
 * @param options.displaySettings 今表示する表示設定
 * @returns 読み込みの状態と、背景・目標文に当てるスタイル
 */
export function useBackgroundPreload({
  displaySettings
}: UseBackgroundPreloadOptions): UseBackgroundPreloadReturn {
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isBackgroundReady, setIsBackgroundReady] = useState(false);

  useEffect(() => {
    const checkStorageLoaded = async () => {
      if (await hasStoredVision()) {
        setIsStorageLoaded(true);
      }
    };
    checkStorageLoaded();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStorageLoaded(true);
    }, STORAGE_LOADED_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const isColorBackground = displaySettings.backgroundType === 'color';
  const backgroundUrl = displaySettings.customBackgroundData
    ? displaySettings.customBackgroundData
    : displaySettings.backgroundImage
      ? getBackgroundUrl(displaySettings.backgroundImage)
      : getBackgroundUrl('default-1');
  const backgroundColor = displaySettings.backgroundColor;

  useEffect(() => {
    if (isColorBackground) {
      setIsBackgroundReady(true);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setIsBackgroundReady(true);
    };
    img.onerror = () => {
      setIsBackgroundReady(true);
    };
    img.src = backgroundUrl;
  }, [backgroundUrl, isColorBackground]);

  const fontSettings = displaySettings.fontSettings;
  const fontDef = getFontDefinition(fontSettings.family);

  useEffect(() => {
    if (fontDef.googleFont) {
      loadGoogleFont(fontDef.googleFont);
    }
  }, [fontDef.googleFont]);

  const fontStyle = useMemo(
    () => ({
      fontFamily: fontDef.css,
      fontSize: `${FONT_SIZE_PX[fontSettings.size]}px`,
      fontWeight: FONT_WEIGHT_VALUE[fontSettings.weight]
    }),
    [fontDef.css, fontSettings.size, fontSettings.weight]
  );

  const containerStyle: React.CSSProperties = useMemo(
    () =>
      isColorBackground
        ? { backgroundColor }
        : isBackgroundReady
          ? {
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }
          : {
              backgroundColor: '#1a1a2e'
            },
    [isColorBackground, backgroundColor, backgroundUrl, isBackgroundReady]
  );

  return {
    isStorageLoaded,
    isBackgroundReady,
    isColorBackground,
    backgroundUrl,
    backgroundColor,
    containerStyle,
    fontStyle
  };
}
