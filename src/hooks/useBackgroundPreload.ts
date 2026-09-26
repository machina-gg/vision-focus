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
  displaySettings: DashboardDisplaySettings;
}

interface UseBackgroundPreloadReturn {
  isStorageLoaded: boolean;
  isBackgroundReady: boolean;
  isColorBackground: boolean;
  backgroundUrl: string;
  backgroundColor: string;
  containerStyle: React.CSSProperties;
  fontStyle: React.CSSProperties;
}

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
