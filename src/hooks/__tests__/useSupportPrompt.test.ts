import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/supportPrompt', () => ({
  getSupportPromptState: vi.fn(),
  shouldShowSupportPrompt: vi.fn(),
  dismissSupportPrompt: vi.fn(),
  markSupportPromptOpened: vi.fn(),
  openSupportPage: vi.fn()
}));

import {
  getSupportPromptState,
  shouldShowSupportPrompt,
  dismissSupportPrompt,
  markSupportPromptOpened,
  openSupportPage
} from '~/lib/supportPrompt';
import { trackFeatureUse } from '~/lib/analytics';
import { useSupportPrompt } from '~/hooks/useSupportPrompt';

const mockGetState = vi.mocked(getSupportPromptState);
const mockShouldShow = vi.mocked(shouldShowSupportPrompt);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetState.mockResolvedValue({ dismissedAt: null, opened: false });
  mockShouldShow.mockReturnValue(true);
});

describe('useSupportPrompt', () => {
  it('表示すべきと判定されたら isVisible が true になる', async () => {
    const { result } = renderHook(() => useSupportPrompt());

    await waitFor(() => {
      expect(result.current.isVisible).toBe(true);
    });
  });

  it('表示すべきでなければ isVisible は false のまま', async () => {
    mockShouldShow.mockReturnValue(false);

    const { result } = renderHook(() => useSupportPrompt());

    await waitFor(() => {
      expect(mockGetState).toHaveBeenCalled();
    });
    expect(result.current.isVisible).toBe(false);
  });

  it('判定が終わるまでは表示しない', async () => {
    const { result } = renderHook(() => useSupportPrompt());

    // storage の読み込みが解決する前は非表示
    expect(result.current.isVisible).toBe(false);

    // 判定の完了まで待ってから終わる（未処理の state 更新を残さない）
    await waitFor(() => expect(result.current.isVisible).toBe(true));
  });

  it('支援ボタンを押すと支援ページを開き、以降表示しない記録を残す', async () => {
    const { result } = renderHook(() => useSupportPrompt());
    await waitFor(() => expect(result.current.isVisible).toBe(true));

    await act(async () => {
      await result.current.handleSupport();
    });

    expect(markSupportPromptOpened).toHaveBeenCalledOnce();
    expect(openSupportPage).toHaveBeenCalledOnce();
    expect(trackFeatureUse).toHaveBeenCalledWith('support_open');
    expect(result.current.isVisible).toBe(false);
  });

  it('閉じると閉じた時刻を記録して非表示になる', async () => {
    const { result } = renderHook(() => useSupportPrompt());
    await waitFor(() => expect(result.current.isVisible).toBe(true));

    await act(async () => {
      await result.current.handleDismiss();
    });

    expect(dismissSupportPrompt).toHaveBeenCalledOnce();
    expect(openSupportPage).not.toHaveBeenCalled();
    expect(result.current.isVisible).toBe(false);
  });
});
