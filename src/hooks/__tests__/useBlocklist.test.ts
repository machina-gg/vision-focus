import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useBlocklist } from '~/hooks/useBlocklist';
import type { AppSettings, BlockItem, TimeLimit } from '~/types/storage';
import { DEFAULT_SETTINGS } from '~/types/storage';

// Mock dependencies
vi.mock('@plasmohq/messaging', () => ({
  sendToBackground: vi.fn()
}));

vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/domain', () => ({
  parseDomainInput: vi.fn()
}));

vi.mock('~/lib/license', () => ({
  canAddToBlocklist: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { sendToBackground } from '@plasmohq/messaging';
import { trackFeatureUse } from '~/lib/analytics';
import { parseDomainInput } from '~/lib/domain';
import { canAddToBlocklist } from '~/lib/license';
import { storage } from '~/lib/storage';

describe('useBlocklist', () => {
  const mockSetSettings = vi.fn();

  const mockBlockItem: BlockItem = {
    id: 'test-id',
    domain: 'youtube.com',
    isWildcard: false,
    createdAt: '2024-01-01T00:00:00Z',
    enabled: true
  };

  const mockSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    blockList: [mockBlockItem]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態でnewDomainが空文字', () => {
      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );
      expect(result.current.newDomain).toBe('');
    });

    it('初期状態でblockErrorが空文字', () => {
      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );
      expect(result.current.blockError).toBe('');
    });
  });

  describe('setNewDomain', () => {
    it('newDomainを更新できる', () => {
      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.setNewDomain('twitter.com');
      });

      expect(result.current.newDomain).toBe('twitter.com');
    });
  });

  describe('handleAddDomain', () => {
    it('settingsがundefinedの場合、何もしない', async () => {
      const { result } = renderHook(() =>
        useBlocklist({ settings: undefined, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(canAddToBlocklist).not.toHaveBeenCalled();
    });

    it('newDomainが空の場合、何もしない', async () => {
      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(canAddToBlocklist).not.toHaveBeenCalled();
    });

    it('ライセンス制限に達した場合、エラーメッセージを設定', async () => {
      vi.mocked(canAddToBlocklist).mockResolvedValue({
        allowed: false,
        limit: 5,
        reason: 'Limit reached: 5 sites'
      });

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.setNewDomain('twitter.com');
      });

      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(result.current.blockError).toBe('Limit reached: 5 sites');
    });

    it('無効なドメイン形式の場合、エラーメッセージを設定', async () => {
      vi.mocked(canAddToBlocklist).mockResolvedValue({
        allowed: true,
        limit: 10
      });
      vi.mocked(parseDomainInput).mockReturnValue(null);

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.setNewDomain('invalid');
      });

      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(result.current.blockError).toBe('Invalid domain format');
    });

    it('既にブロックリストに存在するドメインの場合、エラーメッセージを設定', async () => {
      vi.mocked(canAddToBlocklist).mockResolvedValue({
        allowed: true,
        limit: 10
      });
      vi.mocked(parseDomainInput).mockReturnValue({
        domain: 'youtube.com',
        isWildcard: false
      });

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.setNewDomain('youtube.com');
      });

      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(result.current.blockError).toBe('Domain already in block list');
    });

    it('成功時、背景スクリプトを呼び出し、設定を更新', async () => {
      const updatedSettings: AppSettings = {
        ...mockSettings,
        blockList: [
          mockBlockItem,
          {
            id: 'test-id-2',
            domain: 'twitter.com',
            isWildcard: false,
            createdAt: '2024-01-02T00:00:00Z',
            enabled: true
          }
        ]
      };

      vi.mocked(canAddToBlocklist).mockResolvedValue({
        allowed: true,
        limit: 10
      });
      vi.mocked(parseDomainInput).mockReturnValue({
        domain: 'twitter.com',
        isWildcard: false
      });
      vi.mocked(sendToBackground).mockResolvedValue({ success: true });
      vi.mocked(storage.get).mockResolvedValue(updatedSettings);

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.setNewDomain('twitter.com');
      });

      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(sendToBackground).toHaveBeenCalledWith({
        name: 'add-block',
        body: { domain: 'twitter.com' }
      });
      expect(trackFeatureUse).toHaveBeenCalledWith('block_add');
      expect(result.current.newDomain).toBe('');
      expect(result.current.blockError).toBe('');
      expect(mockSetSettings).toHaveBeenCalledWith(updatedSettings);
    });

    it('背景スクリプトがエラーを返した場合、エラーメッセージを設定', async () => {
      vi.mocked(canAddToBlocklist).mockResolvedValue({
        allowed: true,
        limit: 10
      });
      vi.mocked(parseDomainInput).mockReturnValue({
        domain: 'twitter.com',
        isWildcard: false
      });
      vi.mocked(sendToBackground).mockResolvedValue({
        success: false,
        error: 'Backend error'
      });

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.setNewDomain('twitter.com');
      });

      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(result.current.blockError).toBe('Backend error');
    });

    it('背景スクリプトが例外を投げた場合、エラーメッセージを設定', async () => {
      vi.mocked(canAddToBlocklist).mockResolvedValue({
        allowed: true,
        limit: 10
      });
      vi.mocked(parseDomainInput).mockReturnValue({
        domain: 'twitter.com',
        isWildcard: false
      });
      vi.mocked(sendToBackground).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      act(() => {
        result.current.setNewDomain('twitter.com');
      });

      await act(async () => {
        await result.current.handleAddDomain();
      });

      expect(result.current.blockError).toBe('Failed to add domain');
    });
  });

  describe('handleRemoveDomain', () => {
    it('背景スクリプトを呼び出し、設定を更新', async () => {
      const updatedSettings: AppSettings = {
        ...mockSettings,
        blockList: []
      };

      vi.mocked(sendToBackground).mockResolvedValue({ success: true });
      vi.mocked(storage.get).mockResolvedValue(updatedSettings);

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleRemoveDomain('test-id');
      });

      expect(sendToBackground).toHaveBeenCalledWith({
        name: 'remove-block',
        body: { id: 'test-id' }
      });
      expect(trackFeatureUse).toHaveBeenCalledWith('block_remove');
      expect(mockSetSettings).toHaveBeenCalledWith(updatedSettings);
    });

    it('例外が発生してもエラーをスローしない', async () => {
      vi.mocked(sendToBackground).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleRemoveDomain('test-id');
      });

      // エラーがスローされないことを確認
      expect(mockSetSettings).not.toHaveBeenCalled();
    });
  });

  describe('handleToggleDomain', () => {
    it('背景スクリプトを呼び出し、設定を更新', async () => {
      const updatedSettings: AppSettings = {
        ...mockSettings,
        blockList: [{ ...mockBlockItem, enabled: false }]
      };

      vi.mocked(sendToBackground).mockResolvedValue({ success: true });
      vi.mocked(storage.get).mockResolvedValue(updatedSettings);

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleToggleDomain('test-id', false);
      });

      expect(sendToBackground).toHaveBeenCalledWith({
        name: 'toggle-block',
        body: { id: 'test-id', enabled: false }
      });
      expect(mockSetSettings).toHaveBeenCalledWith(updatedSettings);
    });
  });

  describe('handleUpdateTimeLimit', () => {
    it('背景スクリプトを呼び出し、設定を更新', async () => {
      const timeLimit: TimeLimit = {
        type: 'daily',
        limitSeconds: 3600
      };

      const updatedSettings: AppSettings = {
        ...mockSettings,
        blockList: [{ ...mockBlockItem, timeLimit }]
      };

      vi.mocked(sendToBackground).mockResolvedValue({ success: true });
      vi.mocked(storage.get).mockResolvedValue(updatedSettings);

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleUpdateTimeLimit('test-id', timeLimit);
      });

      expect(sendToBackground).toHaveBeenCalledWith({
        name: 'update-time-limit',
        body: { id: 'test-id', timeLimit }
      });
      expect(mockSetSettings).toHaveBeenCalledWith(updatedSettings);
    });

    it('タイムリミットをnullに設定できる', async () => {
      const updatedSettings: AppSettings = {
        ...mockSettings,
        blockList: [{ ...mockBlockItem, timeLimit: null }]
      };

      vi.mocked(sendToBackground).mockResolvedValue({ success: true });
      vi.mocked(storage.get).mockResolvedValue(updatedSettings);

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleUpdateTimeLimit('test-id', null);
      });

      expect(sendToBackground).toHaveBeenCalledWith({
        name: 'update-time-limit',
        body: { id: 'test-id', timeLimit: null }
      });
      expect(mockSetSettings).toHaveBeenCalledWith(updatedSettings);
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

      expect(storage.set).not.toHaveBeenCalled();
    });

    it('通知設定を更新', async () => {
      vi.mocked(storage.set).mockResolvedValue(undefined);

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

      expect(storage.set).toHaveBeenCalledWith('settings', expectedSettings);
      expect(mockSetSettings).toHaveBeenCalledWith(expectedSettings);
    });

    it('例外が発生してもエラーをスローしない', async () => {
      vi.mocked(storage.set).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() =>
        useBlocklist({ settings: mockSettings, setSettings: mockSetSettings })
      );

      await act(async () => {
        await result.current.handleUpdateNotifications({
          timeLimitEnabled: true,
          timeLimitMinutes: 5
        });
      });

      // エラーがスローされないことを確認
      await waitFor(() => {
        expect(mockSetSettings).not.toHaveBeenCalled();
      });
    });
  });
});
