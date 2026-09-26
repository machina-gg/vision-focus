import { useCallback, useState } from 'react';
import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';

import { trackFeatureUse } from '~/lib/analytics';
import { settingsItem } from '~/lib/storage';
import type {
  AppSettings,
  TimeLimit,
  NotificationSettings
} from '~/types/storage';

interface UseBlocklistOptions {
  /** 今のアプリ設定。読み込み前は undefined */
  settings: AppSettings | undefined;
  /** 画面側のアプリ設定を差し替える */
  setSettings: (settings: AppSettings) => void;
}

interface UseBlocklistReturn {
  /** 追加欄に入力中のドメイン */
  newDomain: string;
  /** 追加欄の入力を変える */
  setNewDomain: (value: string) => void;
  /** 追加に失敗したときの文言。失敗していなければ空文字 */
  blockError: string;
  /** 追加欄のドメインをブロックリストに加える。空欄なら何もしない */
  handleAddDomain: () => Promise<void>;
  /** id（項目のドメイン）をブロックリストから外す */
  handleRemoveDomain: (id: string) => Promise<void>;
  /** id（項目のドメイン）のブロックの有効・無効を切り替える */
  handleToggleDomain: (id: string, enabled: boolean) => Promise<void>;
  /** id（項目のドメイン）の時間制限を変える。null = 常時ブロック */
  handleUpdateTimeLimit: (
    id: string,
    timeLimit: TimeLimit | null
  ) => Promise<void>;
  /** 残り時間の通知の設定を保存する。設定の読み込み前は何もしない */
  handleUpdateNotifications: (
    notifications: NotificationSettings
  ) => Promise<void>;
}

/**
 * ブロックリスト画面の操作（追加・削除・有効切り替え・時間制限・通知設定）と追加欄の入力状態を提供する
 * @param options フックの入力（下記の項目）
 * @param options.settings 今のアプリ設定。読み込み前は undefined
 * @param options.setSettings 通知設定を保存したあと画面側のアプリ設定を差し替える関数
 * @returns 追加欄の入力状態・失敗の文言と、各操作
 */
export function useBlocklist({
  settings,
  setSettings
}: UseBlocklistOptions): UseBlocklistReturn {
  const [newDomain, setNewDomain] = useState('');
  const [blockError, setBlockError] = useState('');

  const handleAddDomain = useCallback(async () => {
    if (!newDomain.trim()) return;

    try {
      const response = await sendMessage('add-block', {
        domain: newDomain.trim()
      });

      if (response.success) {
        trackFeatureUse('block_add');
        setNewDomain('');
        setBlockError('');
      } else {
        setBlockError(messageErrorText(response.error));
      }
    } catch {
      setBlockError(messageErrorText(undefined));
    }
  }, [newDomain]);

  const handleRemoveDomain = useCallback(async (id: string) => {
    try {
      await sendMessage('remove-block', { domain: id });
      trackFeatureUse('block_remove');
    } catch {
      // Silently handle error - list will refresh on next settings change
    }
  }, []);

  const handleToggleDomain = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await sendMessage('toggle-block', { domain: id, enabled });
      } catch {
        // Silently handle error - list will refresh on next settings change
      }
    },
    []
  );

  const handleUpdateTimeLimit = useCallback(
    async (id: string, timeLimit: TimeLimit | null) => {
      try {
        await sendMessage('update-time-limit', { domain: id, timeLimit });
      } catch {
        // Silently handle error - list will refresh on next settings change
      }
    },
    []
  );

  const handleUpdateNotifications = useCallback(
    async (notifications: NotificationSettings) => {
      if (!settings) return;

      try {
        const updatedSettings: AppSettings = {
          ...settings,
          notifications
        };
        await settingsItem.setValue(updatedSettings);
        setSettings(updatedSettings);
      } catch {
        // Silently handle error
      }
    },
    [settings, setSettings]
  );

  return {
    newDomain,
    setNewDomain,
    blockError,
    handleAddDomain,
    handleRemoveDomain,
    handleToggleDomain,
    handleUpdateTimeLimit,
    handleUpdateNotifications
  };
}
