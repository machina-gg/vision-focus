import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePopupActions } from '~/hooks/usePopupActions';
import type { AppSettings } from '~/types/storage';
import { DEFAULT_SETTINGS } from '~/types/storage';

// 依存モジュールをモック
vi.mock('@plasmohq/messaging', () => ({
  sendToBackground: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  openOptionsPage: vi.fn(),
  openExtensionPage: vi.fn()
}));

vi.mock('~/lib/i18n', () => ({
  setCurrentLanguage: vi.fn()
}));

import { sendToBackground } from '@plasmohq/messaging';
import { openOptionsPage, openExtensionPage } from '~/lib/chromeApi';
import { setCurrentLanguage } from '~/lib/i18n';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePopupActions', () => {
  const mockSetSettings = vi.fn();
  const mockClearDomain = vi.fn();
  const defaultProps = {
    settings: DEFAULT_SETTINGS as AppSettings,
    setSettings: mockSetSettings,
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

  describe('handleLanguageChange', () => {
    it('言語を変更しsetCurrentLanguageを呼ぶ', async () => {
      const { result } = renderHook(() => usePopupActions(defaultProps));
      await act(async () => {
        await result.current.handleLanguageChange('ja');
      });
      expect(setCurrentLanguage).toHaveBeenCalledWith('ja');
      expect(mockSetSettings).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'ja' })
      );
    });
  });

  describe('handleBlock', () => {
    it('成功時にclearDomainを呼ぶ', async () => {
      vi.mocked(sendToBackground).mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePopupActions(defaultProps));
      await act(async () => {
        await result.current.handleBlock('youtube.com');
      });
      expect(sendToBackground).toHaveBeenCalledWith({
        name: 'add-block',
        body: { domain: 'youtube.com' }
      });
      expect(mockClearDomain).toHaveBeenCalled();
    });

    it('失敗時はclearDomainを呼ばない', async () => {
      vi.mocked(sendToBackground).mockResolvedValue({
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
      vi.mocked(sendToBackground).mockResolvedValue(undefined);
      const { result } = renderHook(() => usePopupActions(defaultProps));
      await act(async () => {
        await result.current.handlePausedChange(true);
      });
      expect(sendToBackground).toHaveBeenCalledWith({
        name: 'toggle-pause',
        body: { paused: true }
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

  describe('renderKey', () => {
    it('初期値は0', () => {
      const { result } = renderHook(() => usePopupActions(defaultProps));
      expect(result.current.renderKey).toBe(0);
    });
  });
});
