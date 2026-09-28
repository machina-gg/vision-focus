import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useBlocklist } from '~/hooks/useBlocklist';
import type { AppSettings, TimeLimit } from '~/types/storage';
import { DEFAULT_SETTINGS } from '~/types/storage';
import { stubI18nWithLocale } from '~/test/i18n';

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  settingsItem: {
    setValue: vi.fn()
  },
  sitesItem: {
    setValue: vi.fn()
  }
}));

import { sendMessage } from '~/lib/messaging';
import { trackFeatureUse } from '~/lib/analytics';
import { settingsItem, sitesItem } from '~/lib/storage';

describe('useBlocklist', () => {
  stubI18nWithLocale('ja');

  const mockSetSettings = vi.fn();

  const mockSettings: AppSettings = { ...DEFAULT_SETTINGS };

  const render = () =>
    renderHook(() =>
      useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendMessage).mockResolvedValue({ success: true });
  });

  describe('初期状態', () => {
    it('newDomain と blockError は空文字', () => {
      const { result } = render();
      expect(result.current.newDomain).toBe('');
      expect(result.current.blockError).toBe('');
    });
  });

  describe('setNewDomain', () => {
    it('newDomainを更新できる', () => {
      const { result } = render();

      act(() => {
        result.current.setNewDomain('example.com');
      });

      expect(result.current.newDomain).toBe('example.com');
    });
  });

  describe('handleAddDomain', () => {
    it('newDomainが空白だけなら何もしない', async () => {
      const { result } = render();

      act(() => {
        result.current.setNewDomain('   ');
      });
      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('入力を add-block で依頼し、成功したら入力とエラーを空にする', async () => {
      const { result } = render();

      act(() => {
        result.current.setNewDomain(' example.com ');
      });
      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(sendMessage).toHaveBeenCalledWith('add-block', {
        domain: 'example.com'
      });
      expect(trackFeatureUse).toHaveBeenCalledWith('block_add');
      expect(result.current.newDomain).toBe('');
      expect(result.current.blockError).toBe('');
      // 追跡中のサイトは background だけが書く（一覧は保存値の監視で追従する）
      expect(sitesItem.setValue).not.toHaveBeenCalled();
    });

    it('background が拒否した理由を日本語の文言にしてエラーに出す', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: {
          code: 'nested-site',
          domain: 'm.youtube.com',
          nested: { site: 'youtube.com', relation: 'ancestor' }
        }
      });
      const { result } = render();

      act(() => {
        result.current.setNewDomain('m.youtube.com');
      });
      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(result.current.blockError).toBe(
        'm.youtube.com は追跡中の youtube.com に含まれるため追加できません'
      );
      expect(result.current.newDomain).toBe('m.youtube.com');
    });

    it('理由が無い失敗は既定の文言を出す', async () => {
      vi.mocked(sendMessage).mockResolvedValue({ success: false });
      const { result } = render();

      act(() => {
        result.current.setNewDomain('example.com');
      });
      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(result.current.blockError).toBe(
        '操作できませんでした。もう一度お試しください'
      );
    });

    it('背景スクリプトが例外を投げた場合、エラーメッセージを設定', async () => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('Network error'));
      const { result } = render();

      act(() => {
        result.current.setNewDomain('example.com');
      });
      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(result.current.blockError).toBe(
        '操作できませんでした。もう一度お試しください'
      );
    });
  });

  describe('一覧の操作（宛先はサイトキー）', () => {
    it('handleRemoveDomain は remove-block を依頼する', async () => {
      const { result } = render();

      await act(async () => {
        await result.current.handleRemoveDomain('youtube.com');
      });

      expect(sendMessage).toHaveBeenCalledWith('remove-block', {
        domain: 'youtube.com'
      });
      expect(trackFeatureUse).toHaveBeenCalledWith('block_remove');
    });

    it('handleToggleDomain は toggle-block を依頼する', async () => {
      const { result } = render();

      await act(async () => {
        await result.current.handleToggleDomain('youtube.com', false);
      });

      expect(sendMessage).toHaveBeenCalledWith('toggle-block', {
        domain: 'youtube.com',
        enabled: false
      });
    });

    it.each([[{ type: 'daily', limitSeconds: 1800 } as TimeLimit], [null]])(
      'handleUpdateTimeLimit は update-time-limit を依頼する（%o）',
      async (timeLimit) => {
        const { result } = render();

        await act(async () => {
          await result.current.handleUpdateTimeLimit('youtube.com', timeLimit);
        });

        expect(sendMessage).toHaveBeenCalledWith('update-time-limit', {
          domain: 'youtube.com',
          timeLimit
        });
      }
    );

    it('依頼が例外を投げてもスローせず、汎用の失敗の文言を返す', async () => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('Network error'));
      const { result } = render();

      let failures: (string | null)[] = [];
      await act(async () => {
        failures = [
          await result.current.handleRemoveDomain('youtube.com'),
          await result.current.handleToggleDomain('youtube.com', true)
        ];
      });

      expect(failures).toEqual([
        '操作できませんでした。もう一度お試しください',
        '操作できませんでした。もう一度お試しください'
      ]);
    });

    it('成功したら null を返す', async () => {
      vi.mocked(sendMessage).mockResolvedValue({ success: true });
      const { result } = render();

      let failures: (string | null)[] = [];
      await act(async () => {
        failures = [
          await result.current.handleRemoveDomain('youtube.com'),
          await result.current.handleToggleDomain('youtube.com', false)
        ];
      });

      expect(failures).toEqual([null, null]);
    });

    it('パスワードを添えて依頼する', async () => {
      vi.mocked(sendMessage).mockResolvedValue({ success: true });
      const { result } = render();

      await act(async () => {
        await result.current.handleRemoveDomain('a.com', 'secret');
        await result.current.handleToggleDomain('b.com', false, 'secret');
      });

      expect(sendMessage).toHaveBeenCalledWith('remove-block', {
        domain: 'a.com',
        password: 'secret'
      });
      expect(sendMessage).toHaveBeenCalledWith('toggle-block', {
        domain: 'b.com',
        enabled: false,
        password: 'secret'
      });
    });

    it('照合に失敗したら失敗の文言を返し、削除を記録しない', async () => {
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: 'password-mismatch' }
      });
      const { result } = render();

      let failures: (string | null)[] = [];
      await act(async () => {
        failures = [
          await result.current.handleRemoveDomain('a.com', 'wrong'),
          await result.current.handleToggleDomain('a.com', false, 'wrong')
        ];
      });

      expect(failures).toEqual([
        'パスワードが正しくありません。再度お試しください。',
        'パスワードが正しくありません。再度お試しください。'
      ]);
      expect(trackFeatureUse).not.toHaveBeenCalledWith('block_remove');
    });
  });

  describe('handleUpdateNotifications', () => {
    it('settingsがundefinedの場合、何もしない', async () => {
      const { result } = renderHook(() =>
        useBlocklist({ settings: undefined, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleUpdateNotifications({
          timeLimitEnabled: true,
          timeLimitMinutes: 10
        });
      });

      expect(settingsItem.setValue).not.toHaveBeenCalled();
    });

    it('通知設定を更新', async () => {
      vi.mocked(settingsItem.setValue).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      const newNotifications = {
        timeLimitEnabled: false,
        timeLimitMinutes: 10 as const
      };

      await act(async () => {
        await result.current.handleUpdateNotifications(newNotifications);
      });

      const expectedSettings = {
        ...mockSettings,
        notifications: newNotifications
      };

      expect(settingsItem.setValue).toHaveBeenCalledWith(expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
    });

    it('例外が発生してもエラーをスローしない', async () => {
      vi.mocked(settingsItem.setValue).mockRejectedValue(
        new Error('Storage error')
      );

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleUpdateNotifications({
          timeLimitEnabled: true,
          timeLimitMinutes: 5
        });
      });

      await waitFor(() => {
        expect(mockSetSettings).not.toHaveBeenCalled();
      });
    });
  });
});
