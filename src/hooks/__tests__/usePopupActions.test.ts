import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePopupActions } from '~/hooks/usePopupActions';
import type { AppSettings } from '~/types/storage';
import { DEFAULT_SETTINGS } from '~/types/storage';

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  openOptionsPage: vi.fn(),
  openExtensionPage: vi.fn()
}));

import { sendMessage } from '~/lib/messaging';
import { openOptionsPage, openExtensionPage } from '~/lib/chromeApi';
import { stubI18nWithLocale } from '~/test/i18n';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePopupActions', () => {
  const mockClearDomain = vi.fn();
  const defaultProps = {
    settings: DEFAULT_SETTINGS as AppSettings,
    clearDomain: mockClearDomain
  };

  describe('handleSettingsClick', () => {
    it('オプションページを開く', () => {
      const { result } = renderHook(() => usePopupActions(defaultProps));
      act(() => {
        result.current.handleSettingsClick();
      });
      expect(openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('handleHelpClick', () => {
    it('ヘルプページを開く', () => {
      const { result } = renderHook(() => usePopupActions(defaultProps));
      act(() => {
        result.current.handleHelpClick();
      });
      expect(openExtensionPage).toHaveBeenCalledWith('options.html#help');
    });
  });

  describe('handleAnalyticsClick', () => {
    it('アナリティクスページを開く', () => {
      const { result } = renderHook(() => usePopupActions(defaultProps));
      act(() => {
        result.current.handleAnalyticsClick();
      });
      expect(openExtensionPage).toHaveBeenCalledWith('options.html#analytics');
    });
  });

  describe('handleGoalClick', () => {
    it('新しいタブページを開く', () => {
      const { result } = renderHook(() => usePopupActions(defaultProps));
      act(() => {
        result.current.handleGoalClick();
      });
      expect(openExtensionPage).toHaveBeenCalledWith('newtab.html');
    });
  });

  describe('handleBlock', () => {
    stubI18nWithLocale('ja');

    it('成功時にclearDomainを呼ぶ', async () => {
      vi.mocked(sendMessage).mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePopupActions(defaultProps));
      await act(async () => {
        await result.current.handleBlock('youtube.com');
      });
      expect(sendMessage).toHaveBeenCalledWith('add-block', {
        domain: 'youtube.com'
      });
      expect(mockClearDomain).toHaveBeenCalled();
    });

    it('失敗時は拒否の理由を日本語で知らせ、clearDomainを呼ばない', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'already-blocked' }
      });
      const alert = vi.fn();
      vi.stubGlobal('alert', alert);
      const { result } = renderHook(() => usePopupActions(defaultProps));
      await act(async () => {
        await result.current.handleBlock('youtube.com');
      });
      expect(alert).toHaveBeenCalledWith(
        'このサイトは既にブロックリストにあります'
      );
      expect(mockClearDomain).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('理由の無い失敗は汎用の文言で知らせる', async () => {
      vi.mocked(sendMessage).mockResolvedValue({ success: false });
      const alert = vi.fn();
      vi.stubGlobal('alert', alert);
      const { result } = renderHook(() => usePopupActions(defaultProps));
      await act(async () => {
        await result.current.handleBlock('youtube.com');
      });
      expect(alert).toHaveBeenCalledWith(
        '操作できませんでした。もう一度お試しください'
      );
      vi.unstubAllGlobals();
    });
  });

  describe('handlePausedChange', () => {
    it('toggle-pauseメッセージを送信する', async () => {
      vi.mocked(sendMessage).mockResolvedValue({ success: true, paused: true });
      const { result } = renderHook(() => usePopupActions(defaultProps));
      await act(async () => {
        await result.current.handlePausedChange(true);
      });
      expect(sendMessage).toHaveBeenCalledWith('toggle-pause', {
        paused: true
      });
    });

    it('パスワードを添えて送り、成功なら null を返す', async () => {
      vi.mocked(sendMessage).mockResolvedValue({ success: true, paused: true });
      const { result } = renderHook(() => usePopupActions(defaultProps));

      let failure: string | null = 'unset';
      await act(async () => {
        failure = await result.current.handlePausedChange(true, 'secret');
      });

      expect(sendMessage).toHaveBeenCalledWith('toggle-pause', {
        paused: true,
        password: 'secret'
      });
      expect(failure).toBeNull();
    });

    describe('失敗の文言', () => {
      stubI18nWithLocale('ja');

      it('照合に失敗したら応答の失敗の文言を返す', async () => {
        vi.mocked(sendMessage).mockResolvedValue({
          success: false,
          error: { code: 'password-mismatch' }
        });
        const { result } = renderHook(() => usePopupActions(defaultProps));

        let failure: string | null = null;
        await act(async () => {
          failure = await result.current.handlePausedChange(true, 'wrong');
        });

        expect(failure).toBe(
          'パスワードが正しくありません。再度お試しください。'
        );
      });

      it('送信が例外で終わったら汎用の文言を返す', async () => {
        vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
        const { result } = renderHook(() => usePopupActions(defaultProps));

        let failure: string | null = null;
        await act(async () => {
          failure = await result.current.handlePausedChange(true);
        });

        expect(failure).toBe('操作できませんでした。もう一度お試しください');
      });
    });
  });

  describe('isPasswordProtected', () => {
    it('パスワードが有効な場合はtrue', () => {
      const { result } = renderHook(() =>
        usePopupActions({
          ...defaultProps,
          settings: {
            ...DEFAULT_SETTINGS,
            password: { enabled: true, passwordHash: 'hash' }
          }
        })
      );
      expect(result.current.isPasswordProtected).toBe(true);
    });

    it('パスワードが無効な場合はfalse', () => {
      const { result } = renderHook(() => usePopupActions(defaultProps));
      expect(result.current.isPasswordProtected).toBe(false);
    });

    it('保護中かどうかは enabled だけで決める（ハッシュは見ない）', () => {
      const { result } = renderHook(() =>
        usePopupActions({
          ...defaultProps,
          settings: {
            ...DEFAULT_SETTINGS,
            password: { enabled: true, passwordHash: null }
          }
        })
      );
      expect(result.current.isPasswordProtected).toBe(true);
    });
  });
});
