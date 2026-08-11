import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { usePremiumStatus } from '~/hooks/usePremiumStatus';
import { FEATURE_LIMITS } from '~/types/premium';

/**
 * マネタイズ方針の変更により全機能を全ユーザーに開放したため、
 * このフックは非同期の問い合わせを行わず常に解放状態を返す。
 */
describe('usePremiumStatus', () => {
  it('常に解放状態を返す', () => {
    const { result } = renderHook(() => usePremiumStatus());

    expect(result.current.isPremium).toBe(true);
    expect(result.current.featureLimits).toEqual(FEATURE_LIMITS);
  });

  it('読み込み待ちが発生しない', () => {
    const { result } = renderHook(() => usePremiumStatus());

    // 課金状態の問い合わせを行わないため、初回レンダリングから確定している
    expect(result.current.isLoading).toBe(false);
  });

  it('再レンダリングしても同じ値を返す', () => {
    const { result, rerender } = renderHook(() => usePremiumStatus());
    const first = result.current;

    rerender();

    expect(result.current).toEqual(first);
  });
});
