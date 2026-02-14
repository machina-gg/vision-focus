import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePasswordVerification } from '~/hooks/usePasswordVerification';

// password モジュールをモック
vi.mock('~/lib/password', () => ({
  verifyPassword: vi.fn()
}));

// i18n モジュールをモック
vi.mock('~/lib/i18n', () => ({
  getMessage: vi.fn((key: string) => key)
}));

import { verifyPassword } from '~/lib/password';

const mockVerifyPassword = vi.mocked(verifyPassword);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePasswordVerification', () => {
  const mockOnSuccess = vi.fn();
  const passwordHash = 'hashed-password';

  describe('初期状態', () => {
    it('モーダルが非表示', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      expect(result.current.showModal).toBe(false);
    });

    it('パスワード入力が空', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      expect(result.current.passwordInput).toBe('');
    });

    it('エラーがnull', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      expect(result.current.passwordError).toBeNull();
    });

    it('パスワードが非表示', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      expect(result.current.showPassword).toBe(false);
    });

    it('検証中ではない', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      expect(result.current.isVerifying).toBe(false);
    });
  });

  describe('openModal', () => {
    it('モーダルを表示する', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      act(() => {
        result.current.openModal();
      });
      expect(result.current.showModal).toBe(true);
    });

    it('状態をリセットする', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      // パスワードを入力してからopenModal
      act(() => {
        result.current.setPasswordInput('test');
      });
      act(() => {
        result.current.openModal();
      });
      expect(result.current.passwordInput).toBe('');
    });
  });

  describe('closeModal', () => {
    it('モーダルを非表示にする', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      act(() => {
        result.current.openModal();
      });
      act(() => {
        result.current.closeModal();
      });
      expect(result.current.showModal).toBe(false);
    });
  });

  describe('setPasswordInput', () => {
    it('パスワード入力を更新する', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      act(() => {
        result.current.setPasswordInput('mypassword');
      });
      expect(result.current.passwordInput).toBe('mypassword');
    });
  });

  describe('toggleShowPassword', () => {
    it('パスワード表示を切り替える', () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      expect(result.current.showPassword).toBe(false);
      act(() => {
        result.current.toggleShowPassword();
      });
      expect(result.current.showPassword).toBe(true);
      act(() => {
        result.current.toggleShowPassword();
      });
      expect(result.current.showPassword).toBe(false);
    });
  });

  describe('handleSubmit', () => {
    it('パスワード未入力の場合はエラーを表示', async () => {
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(result.current.passwordError).toBe('passwordRequired');
    });

    it('passwordHashがnullの場合はエラーを表示', async () => {
      const { result } = renderHook(() =>
        usePasswordVerification({
          passwordHash: null,
          onSuccess: mockOnSuccess
        })
      );
      act(() => {
        result.current.setPasswordInput('test');
      });
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(result.current.passwordError).toBe('passwordRequired');
    });

    it('正しいパスワードでonSuccessを呼ぶ', async () => {
      mockVerifyPassword.mockResolvedValue(true);
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      act(() => {
        result.current.openModal();
        result.current.setPasswordInput('correct');
      });
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(result.current.showModal).toBe(false);
    });

    it('間違ったパスワードでエラーを表示', async () => {
      mockVerifyPassword.mockResolvedValue(false);
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      act(() => {
        result.current.setPasswordInput('wrong');
      });
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(result.current.passwordError).toBe('passwordIncorrect');
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('検証エラーの場合はエラーメッセージを表示', async () => {
      mockVerifyPassword.mockRejectedValue(new Error('Crypto error'));
      const { result } = renderHook(() =>
        usePasswordVerification({ passwordHash, onSuccess: mockOnSuccess })
      );
      act(() => {
        result.current.setPasswordInput('test');
      });
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(result.current.passwordError).toBe('passwordVerificationFailed');
    });
  });
});
