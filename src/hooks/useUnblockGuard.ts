import { useCallback, useState } from 'react';

import { getMessage } from '~/lib/i18n';
import type { TimeLimit } from '~/types/storage';

/** 確認モーダルの文言を切り替える種別（無効化 / 削除） */
export type UnblockAction = 'toggle' | 'delete';

/** ブロックを弱める操作 1 件ぶんの依頼（確認モーダルに出す情報と、確認後に実行する処理） */
export interface UnblockRequest {
  domain: string;
  /** ブロック方式の表示に使う。null・undefined = 常時ブロック */
  timeLimit: TimeLimit | null | undefined;
  action: UnblockAction;
  /** 確認が通ったときにだけ呼ばれる */
  onConfirm: () => void;
}

export interface PendingUnblock extends UnblockRequest {
  /** 確認モーダルに出すブロック方式のラベル */
  blockStyle: string;
}

type GuardMode = 'password' | 'confirm';

/** ブロック方式の表示ラベル（「1日の制限」/「常時ブロック」）を返す */
export function getBlockStyleLabel(
  timeLimit: TimeLimit | null | undefined
): string {
  return getMessage(timeLimit ? 'dailyLimit' : 'alwaysBlocked');
}

/** ブロックを弱める操作を、パスワード保護中はパスワード入力、それ以外は長押し確認を通してから実行させる */
export function useUnblockGuard(isPasswordProtected: boolean) {
  const [pending, setPending] = useState<PendingUnblock | null>(null);
  const [mode, setMode] = useState<GuardMode | null>(null);

  const requestUnblock = useCallback(
    (request: UnblockRequest) => {
      setPending({
        ...request,
        blockStyle: getBlockStyleLabel(request.timeLimit)
      });
      setMode(isPasswordProtected ? 'password' : 'confirm');
    },
    [isPasswordProtected]
  );

  // モーダルは確定時に onConfirm → onClose の順で呼ぶため、後片付けは close に任せる
  const confirm = useCallback(() => {
    pending?.onConfirm();
  }, [pending]);

  const close = useCallback(() => {
    setPending(null);
    setMode(null);
  }, []);

  return {
    pending,
    isPasswordModalOpen: pending !== null && mode === 'password',
    isConfirmModalOpen: pending !== null && mode === 'confirm',
    requestUnblock,
    confirm,
    close
  };
}
