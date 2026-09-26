import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { useUnblockGuard } from '~/hooks/useUnblockGuard';
import type { UnblockRequest } from '~/hooks/useUnblockGuard';

/**
 * useUnblockGuard の振り分けと実行タイミングの検査
 *
 * ブロックを弱める操作は、確認が通るまで実行してはいけない。
 * ここでは「どちらのモーダルが開くか」と「onConfirm が呼ばれるのは
 * confirm の時だけか」を確かめる。
 *
 * chrome.i18n はテスト環境に無く、getMessage はキー名をそのまま返す。
 */

function requestOf(overrides: Partial<UnblockRequest> = {}): UnblockRequest {
  return {
    domain: 'example.com',
    timeLimit: null,
    action: 'toggle',
    onConfirm: vi.fn(),
    ...overrides
  };
}

describe('useUnblockGuard', () => {
  it('依頼が無い間はどちらのモーダルも開かない', () => {
    const { result } = renderHook(() => useUnblockGuard(false));

    expect(result.current.pending).toBeNull();
    expect(result.current.isConfirmModalOpen).toBe(false);
    expect(result.current.isPasswordModalOpen).toBe(false);
  });

  it('パスワード保護なしなら長押し確認が開き、まだ実行しない', () => {
    const { result } = renderHook(() => useUnblockGuard(false));
    const request = requestOf();

    act(() => result.current.requestUnblock(request));

    expect(result.current.isConfirmModalOpen).toBe(true);
    expect(result.current.isPasswordModalOpen).toBe(false);
    expect(request.onConfirm).not.toHaveBeenCalled();
  });

  it('パスワード保護中ならパスワード入力が開き、まだ実行しない', () => {
    const { result } = renderHook(() => useUnblockGuard(true));
    const request = requestOf();

    act(() => result.current.requestUnblock(request));

    expect(result.current.isPasswordModalOpen).toBe(true);
    expect(result.current.isConfirmModalOpen).toBe(false);
    expect(request.onConfirm).not.toHaveBeenCalled();
  });

  it('依頼の表示情報をそのまま保持する', () => {
    const { result } = renderHook(() => useUnblockGuard(false));

    act(() =>
      result.current.requestUnblock(
        requestOf({ domain: 'youtube.com', action: 'delete' })
      )
    );

    expect(result.current.pending).toMatchObject({
      domain: 'youtube.com',
      action: 'delete'
    });
  });

  it('時間制限が無ければブロック方式は常時ブロックと表示する', () => {
    const { result } = renderHook(() => useUnblockGuard(false));

    act(() => result.current.requestUnblock(requestOf({ timeLimit: null })));

    expect(result.current.pending?.blockStyle).toBe('alwaysBlocked');
  });

  it('時間制限があればブロック方式は 1 日の上限と表示する', () => {
    const { result } = renderHook(() => useUnblockGuard(false));

    act(() =>
      result.current.requestUnblock(
        requestOf({ timeLimit: { type: 'daily', limitSeconds: 1800 } })
      )
    );

    expect(result.current.pending?.blockStyle).toBe('dailyLimit');
  });

  it('confirm で依頼の onConfirm が 1 回だけ呼ばれる', () => {
    const { result } = renderHook(() => useUnblockGuard(false));
    const request = requestOf();

    act(() => result.current.requestUnblock(request));
    act(() => result.current.confirm());

    expect(request.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('close すると依頼を捨て、実行もしない', () => {
    const { result } = renderHook(() => useUnblockGuard(true));
    const request = requestOf();

    act(() => result.current.requestUnblock(request));
    act(() => result.current.close());

    expect(result.current.pending).toBeNull();
    expect(result.current.isPasswordModalOpen).toBe(false);
    expect(request.onConfirm).not.toHaveBeenCalled();
  });

  it('close の後に confirm が来ても実行しない', () => {
    const { result } = renderHook(() => useUnblockGuard(false));
    const request = requestOf();

    act(() => result.current.requestUnblock(request));
    act(() => result.current.close());
    act(() => result.current.confirm());

    expect(request.onConfirm).not.toHaveBeenCalled();
  });
});
