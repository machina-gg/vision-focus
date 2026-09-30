import React, { useEffect, useMemo, useState } from 'react';

import { getBackgroundUrl, FONT_SIZE_PX, FONT_WEIGHT_VALUE } from '~/constants';
import { STORAGE_LOADED_TIMEOUT_MS } from '~/constants/intervals';
import { hasStoredVision } from '~/lib/storage';
import type { DashboardDisplaySettings } from '~/types/storage';
import { getFontDefinition } from '~/types/font';

interface UseBackgroundPreloadOptions {
  /** 今表示する表示設定 */
  displaySettings: DashboardDisplaySettings;
  /** 今表示するスタイルの画像の data URL（useBackgroundImage の戻り値）。null = 画像なし / undefined = 読み込み中 */
  customBackgroundData: string | null | undefined;
}

interface UseBackgroundPreloadReturn {
  /** 保存済みの表示設定を読めたか（保存値が無くても一定時間で true になる） */
  isStorageLoaded: boolean;
  /** 背景を出せる状態か（画像は読み込みが終わるか失敗したら true。単色なら最初から true。利用者の画像を読み込み中なら false） */
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
 * ダッシュボードの背景画像を先読みし、表示してよいかの状態と適用するスタイル（背景と目標文のフォント）を返す
 * @param options フックの入力（下記の項目）
 * @param options.displaySettings 今表示する表示設定
 * @param options.customBackgroundData 今表示するスタイルの画像の data URL。null = 画像なし / undefined = 読み込み中
 * @returns 読み込みの状態と、背景・目標文に当てるスタイル
 */
export function useBackgroundPreload({
  displaySettings,
  customBackgroundData
}: UseBackgroundPreloadOptions): UseBackgroundPreloadReturn {
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);

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
  const isCustomBackgroundPending =
    !isColorBackground && customBackgroundData === undefined;
  const backgroundUrl = customBackgroundData
    ? customBackgroundData
    : displaySettings.backgroundImage
      ? getBackgroundUrl(displaySettings.backgroundImage)
      : getBackgroundUrl('default-1');
  const backgroundColor = displaySettings.backgroundColor;

  useEffect(() => {
    if (isColorBackground) {
      setIsPreloaded(true);
      return;
    }
    if (isCustomBackgroundPending) return;

    const img = new Image();
    img.onload = () => {
      setIsPreloaded(true);
    };
    img.onerror = () => {
      setIsPreloaded(true);
    };
    img.src = backgroundUrl;
  }, [backgroundUrl, isColorBackground, isCustomBackgroundPending]);

  // 読み込み中に同梱の画像を出すと、利用者の画像に切り替わる前に一瞬見えてしまう
  const isBackgroundReady = isPreloaded && !isCustomBackgroundPending;

  const fontSettings = displaySettings.fontSettings;
  const fontDef = getFontDefinition(fontSettings.family);

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
