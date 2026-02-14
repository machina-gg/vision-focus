import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePremiumStatus } from '~/hooks/usePremiumStatus';

// license モジュールをモック
vi.mock('~/lib/license', () => ({
  checkPremiumStatus: vi.fn(),
  getFeatureLimits: vi.fn()
}));

import { checkPremiumStatus, getFeatureLimits } from '~/lib/license';
import { FEATURE_LIMITS } from '~/types/premium';

const mockCheckPremiumStatus = vi.mocked(checkPremiumStatus);
const mockGetFeatureLimits = vi.mocked(getFeatureLimits);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePremiumStatus', () => {
  it('初期状態ではisLoading=true', () => {
    mockCheckPremiumStatus.mockResolvedValue({ isPremium: false });
    mockGetFeatureLimits.mockResolvedValue(FEATURE_LIMITS.free);
    const { result } = renderHook(() => usePremiumStatus());
    expect(result.current.isLoading).toBe(true);
  });

  it('無料ユーザーの場合', async () => {
    mockCheckPremiumStatus.mockResolvedValue({ isPremium: false });
    mockGetFeatureLimits.mockResolvedValue(FEATURE_LIMITS.free);
    const { result } = renderHook(() => usePremiumStatus());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isPremium).toBe(false);
    expect(result.current.featureLimits).toEqual(FEATURE_LIMITS.free);
  });

  it('プレミアムユーザーの場合', async () => {
    mockCheckPremiumStatus.mockResolvedValue({ isPremium: true });
    mockGetFeatureLimits.mockResolvedValue(FEATURE_LIMITS.premium);
    const { result } = renderHook(() => usePremiumStatus());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isPremium).toBe(true);
    expect(result.current.featureLimits).toEqual(FEATURE_LIMITS.premium);
  });

  // 注意: try/finally（catchなし）のため、checkPremiumStatus がエラーの場合は
  // unhandled rejection が発生する。これはプロダクションコードの設計に依存。
});
