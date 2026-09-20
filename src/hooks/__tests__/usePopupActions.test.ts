import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePopupActions } from '~/hooks/usePopupActions';
import type { AppSettings } from '~/types/storage';
import { DEFAULT_SETTINGS } from '~/types/storage';

// 依存モジュールをモック
vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  openOptionsPage: vi.fn(),
  openExtensionPage: vi.fn()
}));

import { sendMessage } from '~/lib/messaging';
import { openOptionsPage, openExtensionPage } from '~/lib/chromeApi';

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

    it('失敗時はclearDomainを呼ばない', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: 'Error'
      });
      // alertをモック
      vi.stubGlobal('alert', vi.fn());
      const { result } = renderHook(() => usePopupActions(defaultProps));
      await act(async () => {
        await result.current.handleBlock('youtube.com');
      });
      expect(mockClearDomain).not.toHaveBeenCalled();
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

    it('パスワードハッシュがnullの場合はfalse', () => {
      const { result } = renderHook(() =>
        usePopupActions({
          ...defaultProps,
          settings: {
            ...DEFAULT_SETTINGS,
            password: { enabled: true, passwordHash: null }
          }
        })
      );
      expect(result.current.isPasswordProtected).toBe(false);
    });
  });
});
