import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { WxtStorageItem } from '@wxt-dev/storage';

import { useStorageItem } from '../useStorageItem';

interface TestValue {
  goal: string;
}

const FALLBACK: TestValue = { goal: 'default' };

function createFakeItem(initial: TestValue | null = null) {
  const value = initial;
  const listeners = new Set<(newValue: TestValue) => void>();
  const unwatch = vi.fn();

  const item = {
    key: 'local:test',
    fallback: FALLBACK,
    defaultValue: FALLBACK,
    getValue: vi.fn(async () => value ?? FALLBACK),
    watch: vi.fn((callback: (newValue: TestValue) => void) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
        unwatch();
      };
    })
  };

  return {
    item: item as unknown as WxtStorageItem<TestValue, Record<string, unknown>>,
    unwatch,
    emit: (next: TestValue) => listeners.forEach((listener) => listener(next))
  };
}

describe('useStorageItem', () => {
  it('保存済みの値が無ければ fallback を返す', async () => {
    const { item } = createFakeItem();
    const { result } = renderHook(() => useStorageItem(item));

    expect(result.current).toEqual(FALLBACK);
    await waitFor(() => expect(item.getValue).toHaveBeenCalled());
    expect(result.current).toEqual(FALLBACK);
  });

  it('使えない形の値（旧形式の文字列）は fallback に倒す', async () => {
    const { item, emit } = createFakeItem();
    // JSON 文字列で保存された古いデータが残っている状態を模す
    vi.mocked(item.getValue).mockResolvedValue(
      JSON.stringify({ goal: 'stale' }) as unknown as TestValue
    );

    const { result } = renderHook(() => useStorageItem(item));

    await waitFor(() => expect(item.getValue).toHaveBeenCalled());
    expect(result.current).toEqual(FALLBACK);

    act(() => {
      emit(JSON.stringify({ goal: 'stale' }) as unknown as TestValue);
    });

    expect(result.current).toEqual(FALLBACK);
  });

  it('マウント時に保存済みの値を読み込む', async () => {
    const { item } = createFakeItem({ goal: 'stored' });
    const { result } = renderHook(() => useStorageItem(item));

    await waitFor(() => expect(result.current).toEqual({ goal: 'stored' }));
  });

  it('他コンテキストの変更に追従する', async () => {
    const { item, emit } = createFakeItem();
    const { result } = renderHook(() => useStorageItem(item));

    await waitFor(() => expect(item.watch).toHaveBeenCalled());

    act(() => {
      emit({ goal: 'from-background' });
    });

    expect(result.current).toEqual({ goal: 'from-background' });
  });

  it('アンマウント時に監視を解除する', async () => {
    const { item, unwatch } = createFakeItem();
    const { unmount } = renderHook(() => useStorageItem(item));

    await waitFor(() => expect(item.watch).toHaveBeenCalled());
    unmount();

    expect(unwatch).toHaveBeenCalled();
  });
});
