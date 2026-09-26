import { useCallback, useEffect, useRef, useState } from 'react';

import type { WxtStorageItem } from '@wxt-dev/storage';

import { objectOrFallback } from '~/lib/storedValue';

/** 保存して state も更新する。値か更新関数を受け、`undefined` なら直近の値をそのまま保存し直す */
export type StorageItemSetter<T> = (
  value: T | undefined | ((previous: T) => T)
) => Promise<void>;

/** ストレージ項目を React の state として読み書きする（初期値は fallback。保存値の変更に追従する） */
export function useStorageItem<T, M extends Record<string, unknown>>(
  item: WxtStorageItem<T, M>
): [T, StorageItemSetter<T>] {
  const [value, setValue] = useState<T>(item.fallback);

  const latestValue = useRef<T>(item.fallback);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    const unwatch = item.watch((newValue) => {
      if (isMounted.current)
        setValue(objectOrFallback(newValue, item.fallback));
    });

    void (async () => {
      const stored = await item.getValue();
      if (isMounted.current) setValue(objectOrFallback(stored, item.fallback));
    })();

    return () => {
      isMounted.current = false;
      unwatch();
    };
  }, [item]);

  const setStoredValue = useCallback<StorageItemSetter<T>>(
    async (next) => {
      // 保存する値が関数型のストレージ項目は無いため、関数なら更新関数とみなす
      const resolved =
        typeof next === 'function'
          ? (next as (previous: T) => T)(latestValue.current)
          : (next ?? latestValue.current);

      await item.setValue(resolved);
      if (isMounted.current) setValue(resolved);
    },
    [item]
  );

  return [value, setStoredValue];
}
