import { useCallback, useState } from 'react';
import { sendMessage } from '~/lib/messaging';
import { messageErrorText } from '~/lib/messageError';

import { trackFeatureUse } from '~/lib/analytics';
import type { TimeLimit, NotificationSettings } from '~/types/storage';

interface UseBlocklistReturn {
  /** 追加欄に入力中のドメイン */
  newDomain: string;
  /** 追加欄の入力を変える */
  setNewDomain: (value: string) => void;
  /** 追加に失敗したときの文言。失敗していなければ空文字 */
  blockError: string;
  /** 追加欄のドメインをブロックリストに加える。空欄なら何もしない */
  handleAddDomain: () => Promise<void>;
  /** id（項目のドメイン）をブロックリストから外す（パスワード保護中は password を添える）。失敗の文言、外せたら null を返す */
  handleRemoveDomain: (id: string, password?: string) => Promise<string | null>;
  /** id（項目のドメイン）のブロックの有効・無効を切り替える（保護中に無効にするときは password を添える）。失敗の文言、切り替えたら null を返す */
  handleToggleDomain: (
    id: string,
    enabled: boolean,
    password?: string
  ) => Promise<string | null>;
  /** id（項目のドメイン）の時間制限を変える。null = 常時ブロック */
  handleUpdateTimeLimit: (
    id: string,
    timeLimit: TimeLimit | null
  ) => Promise<void>;
  /** 入力したホストを許可サイトにする（「時間を記録する」は OFF で始まる）。失敗の文言、追加したら null を返す */
  handleAddAllowedSite: (input: string) => Promise<string | null>;
  /** 許可サイトを登録ごと消す（そのホストの記録も消える）。失敗の文言、消せたら null を返す */
  handleRemoveAllowedSite: (domain: string) => Promise<string | null>;
  /** 許可サイトの「時間を記録する」を切り替える。失敗の文言、切り替えたら null を返す */
  handleSetAllowedSiteRecording: (
    domain: string,
    recordTime: boolean
  ) => Promise<string | null>;
  /** 残り時間の通知の設定の保存を background に依頼する。失敗したら表示は保存値のまま */
  handleUpdateNotifications: (
    notifications: NotificationSettings
  ) => Promise<void>;
}

/**
 * ブロックリスト画面の操作（追加・削除・有効切り替え・時間制限・許可サイト・通知設定）と追加欄の入力状態を提供する（保存はすべて background に依頼する）
 * @returns 追加欄の入力状態・失敗の文言と、各操作
 */
export function useBlocklist(): UseBlocklistReturn {
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

  const handleRemoveDomain = useCallback(
    async (id: string, password?: string) => {
      try {
        const response = await sendMessage('remove-block', {
          domain: id,
          password
        });
        if (!response.success) return messageErrorText(response.error);
        trackFeatureUse('block_remove');
        return null;
      } catch {
        return messageErrorText(undefined);
      }
    },
    []
  );

  const handleToggleDomain = useCallback(
    async (id: string, enabled: boolean, password?: string) => {
      try {
        const response = await sendMessage('toggle-block', {
          domain: id,
          enabled,
          password
        });
        return response.success ? null : messageErrorText(response.error);
      } catch {
        return messageErrorText(undefined);
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

  const handleAddAllowedSite = useCallback(async (input: string) => {
    try {
      const response = await sendMessage('add-allowed-site', {
        domain: input.trim()
      });
      return response.success ? null : messageErrorText(response.error);
    } catch {
      return messageErrorText(undefined);
    }
  }, []);

  const handleRemoveAllowedSite = useCallback(async (domain: string) => {
    try {
      const response = await sendMessage('stop-tracking', { domain });
      return response.success ? null : messageErrorText(response.error);
    } catch {
      return messageErrorText(undefined);
    }
  }, []);

  const handleSetAllowedSiteRecording = useCallback(
    async (domain: string, recordTime: boolean) => {
      try {
        const response = await sendMessage('set-allowed-site-recording', {
          domain,
          recordTime
        });
        return response.success ? null : messageErrorText(response.error);
      } catch {
        return messageErrorText(undefined);
      }
    },
    []
  );

  const handleUpdateNotifications = useCallback(
    async (notifications: NotificationSettings) => {
      await sendMessage('update-notifications', { notifications }).catch(
        () => undefined
      );
    },
    []
  );

  return {
    newDomain,
    setNewDomain,
    blockError,
    handleAddDomain,
    handleRemoveDomain,
    handleToggleDomain,
    handleUpdateTimeLimit,
    handleAddAllowedSite,
    handleRemoveAllowedSite,
    handleSetAllowedSiteRecording,
    handleUpdateNotifications
  };
}
