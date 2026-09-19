import { useCallback, useEffect, useRef, useState } from 'react';

import type { WxtStorageItem } from '@wxt-dev/storage';

/**
 * 値の更新関数。
 *
 * - `T`: そのまま保存する
 * - 関数: 直近の値を受け取って新しい値を返す（React の setState と同じ形）
 * - `undefined`: 直近の値をそのまま保存し直す
 */
export type StorageItemSetter<T> = (
  value: T | undefined | ((previous: T) => T)
) => Promise<void>;

/**
 * ストレージ項目を React の state として扱うフック。
 *
 * 初期値は項目の `fallback`。マウント時に保存済みの値を読み直し、以降は
 * `watch` で他コンテキスト（background / 他のタブ）の変更にも追従する。
 * 更新関数はストレージへの保存を待ってから state を更新する。
 */
export function useStorageItem<T, M extends Record<string, unknown>>(
  item: WxtStorageItem<T, M>
): [T, StorageItemSetter<T>] {
  const [value, setValue] = useState<T>(item.fallback);

  // 更新関数から参照する直近の値（再生成を避けるため ref に持つ）
  const latestValue = useRef<T>(item.fallback);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  // アンマウント後に state を触らないための目印
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    const unwatch = item.watch((newValue) => {
      if (isMounted.current) setValue(newValue);
    });

    void (async () => {
      const stored = await item.getValue();
      if (isMounted.current) setValue(stored);
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
