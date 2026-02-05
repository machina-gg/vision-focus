import React, { useEffect, useMemo, useState } from 'react';

import {
  getBackgroundUrl,
  loadGoogleFont,
  FONT_WEIGHT_VALUE
} from '~/constants';
import { storage } from '~/lib/storage';
import type { DashboardDisplaySettings, VisionSettings } from '~/types/storage';
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

  // Mark storage as loaded once we have vision data beyond default
  useEffect(() => {
    const checkStorageLoaded = async () => {
      const storedVision = await storage.get<VisionSettings>('vision');
      if (storedVision !== undefined) {
        setIsStorageLoaded(true);
      }
    };
    checkStorageLoaded();
  }, []);

  // Also mark as loaded after a short timeout to handle first-time users
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStorageLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const isColorBackground = displaySettings.backgroundType === 'color';
  const backgroundUrl = displaySettings.customBackgroundData
    ? displaySettings.customBackgroundData
    : displaySettings.backgroundImage
      ? getBackgroundUrl(displaySettings.backgroundImage)
      : getBackgroundUrl('default-1');
  const backgroundColor = displaySettings.backgroundColor;

  // Preload background image to prevent flicker
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

  // Load Google Font
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
        : {
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          },
    [isColorBackground, backgroundColor, backgroundUrl]
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
