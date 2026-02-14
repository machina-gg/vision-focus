import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useLicense } from '~/hooks/useLicense';

// extpay モジュールをモック
vi.mock('~/lib/extpay', () => ({
  openPaymentPage: vi.fn(),
  openManagementPage: vi.fn()
}));

import { openPaymentPage, openManagementPage } from '~/lib/extpay';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useLicense', () => {
  it('handleUpgradeがopenPaymentPageを呼ぶ', () => {
    const { result } = renderHook(() => useLicense());
    act(() => {
      result.current.handleUpgrade();
    });
    expect(openPaymentPage).toHaveBeenCalled();
  });

  it('handleManageSubscriptionがopenManagementPageを呼ぶ', () => {
    const { result } = renderHook(() => useLicense());
    act(() => {
      result.current.handleManageSubscription();
    });
    expect(openManagementPage).toHaveBeenCalled();
  });
});
