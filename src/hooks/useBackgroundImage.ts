import { useEffect, useState } from 'react';

import { getBackgroundImage } from '~/lib/storage';

interface LoadedImage {
  imageId: string;
  dataUrl: string | null;
}

/**
 * スタイルの背景画像を 1 枚だけ読む（画像は差し替えるたびに ID が変わり、同じ ID の中身は変わらないので、変更を監視しない）
 * @param imageId 読む画像の ID。null なら読まない
 * @returns 画像の data URL。null = 画像なし（ID が null・保存されていない・読めない）/ undefined = 読み込み中
 */
export function useBackgroundImage(
  imageId: string | null
): string | null | undefined {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);

  useEffect(() => {
    if (imageId === null) return;
    let active = true;
    getBackgroundImage(imageId).then(
      (dataUrl) => {
        if (active) setLoaded({ imageId, dataUrl });
      },
      () => {
        if (active) setLoaded({ imageId, dataUrl: null });
      }
    );
    return () => {
      active = false;
    };
  }, [imageId]);

  if (imageId === null) return null;
  return loaded?.imageId === imageId ? loaded.dataUrl : undefined;
}
