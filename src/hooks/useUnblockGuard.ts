import { useCallback, useState } from 'react';

import { getMessage } from '~/lib/i18n';
import type { TimeLimit } from '~/types/storage';

/** 確認モーダルの文言を切り替える種別（無効化 / 削除） */
export type UnblockAction = 'toggle' | 'delete';

/**
 * ブロックを弱める操作 1 件ぶんの依頼
 *
 * 確認モーダルに出す情報と、確認が通ったときに実行する処理の組。
 * 呼び出し側は解除そのものをここに渡し、自分では実行しない。
 */
export interface UnblockRequest {
  /** 確認モーダルに表示するドメイン */
  domain: string;
  /** ブロック方式の表示（時間制限の有無で「1 日の上限 / 常時ブロック」を出し分ける） */
  timeLimit: TimeLimit | null | undefined;
  action: UnblockAction;
  /** 確認が通ったときにだけ呼ばれる */
  onConfirm: () => void;
}

export interface PendingUnblock extends UnblockRequest {
  /** 確認モーダルに渡すブロック方式のラベル */
  blockStyle: string;
}

type GuardMode = 'password' | 'confirm';

export function getBlockStyleLabel(
  timeLimit: TimeLimit | null | undefined
): string {
  return getMessage(timeLimit ? 'dailyLimit' : 'alwaysBlocked');
}

/**
 * ブロックを弱める操作を、確認を通してから実行する流れをまとめる
 *
 * パスワード保護中はパスワード入力、それ以外は長押し確認へ振り分ける。
 * どちらの経路でも確認が通るまで onConfirm を呼ばないので、
 * キャンセルすれば呼び出し側の状態は何も変わらない。
 * 分岐をここ 1 箇所に置くのは、操作ごとに分岐を書くと一部の操作だけ
 * 確認を素通りする状態が生まれるため。
 */
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
