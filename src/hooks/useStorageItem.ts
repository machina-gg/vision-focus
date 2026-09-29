import { useEffect, useState } from 'react';

import type { WxtStorageItem } from '@wxt-dev/storage';

import { objectOrFallback } from '~/lib/storedValue';

/**
 * ストレージ項目を読み取り専用の React の state として購読する（書き込みは background へのメッセージで依頼する）
 * @param item 購読するストレージ項目
 * @returns 今の値。読み込み前・保存値が壊れているときは fallback
 */
export function useStorageItem<T, M extends Record<string, unknown>>(
  item: WxtStorageItem<T, M>
): T {
  const [value, setValue] = useState<T>(item.fallback);

  useEffect(() => {
    let isMounted = true;

    const unwatch = item.watch((newValue) => {
      if (isMounted) setValue(objectOrFallback(newValue, item.fallback));
    });

    void (async () => {
      const stored = await item.getValue();
      if (isMounted) setValue(objectOrFallback(stored, item.fallback));
    })();

    return () => {
      isMounted = false;
      unwatch();
    };
  }, [item]);

  return value;
}
