import { useCallback, useState } from 'react';

import { getMessage } from '~/lib/i18n';
import type { TimeLimit, UnblockHoldSeconds } from '~/types/storage';

/** 確認モーダルの文言を切り替える種別（無効化 / 削除 / 長押しの秒数を短くする） */
export type UnblockAction = 'toggle' | 'delete' | 'shorten-hold';

/** ブロックを弱める操作の対象（サイトのブロックを外すか、長押しの秒数を短くするか） */
export type UnblockTarget =
  | {
      /** 確認モーダルの文言の種別 */
      action: 'toggle' | 'delete';
      /** 対象のサイトのドメイン（確認モーダルに出す） */
      domain: string;
      /** ブロック方式の表示に使う。null・undefined = 常時ブロック */
      timeLimit: TimeLimit | null | undefined;
    }
  | {
      /** 確認モーダルの文言の種別 */
      action: 'shorten-hold';
      /** 短くしたあとの秒数（確認モーダルに出す） */
      nextHoldSeconds: UnblockHoldSeconds;
    };

/** ブロックを弱める操作 1 件ぶんの依頼（確認モーダルに出す対象と、確認後に実行する処理） */
export type UnblockRequest = UnblockTarget & {
  /** 確認が通ったときにだけ呼ばれる。パスワード入力を通ったときは入力されたパスワードを受け取り、操作を依頼して失敗の文言（成功なら null）を返す */
  onConfirm: (password?: string) => Promise<string | null>;
};

/** 確認モーダルに出す内容（サイトのブロックを外すときはブロック方式のラベルを添える） */
export type UnblockConfirmSubject =
  | {
      /** 確認モーダルの文言の種別 */
      action: 'toggle' | 'delete';
      /** 対象のサイトのドメイン */
      domain: string;
      /** ブロック方式のラベル */
      blockStyle: string;
    }
  | {
      /** 確認モーダルの文言の種別 */
      action: 'shorten-hold';
      /** 短くしたあとの秒数 */
      nextHoldSeconds: UnblockHoldSeconds;
    };

/** 確認待ちの依頼（確認モーダルに出す内容と、確認後に実行する処理） */
export interface PendingUnblock {
  /** 確認モーダルに出す内容 */
  subject: UnblockConfirmSubject;
  /** 確認が通ったときにだけ呼ぶ（UnblockRequest の onConfirm） */
  onConfirm: UnblockRequest['onConfirm'];
}

type GuardMode = 'password' | 'confirm';

/** ブロック方式の表示ラベル（「1日の制限」/「常時ブロック」）を返す */
function getBlockStyleLabel(timeLimit: TimeLimit | null | undefined): string {
  return getMessage(timeLimit ? 'dailyLimit' : 'alwaysBlocked');
}

function toSubject(request: UnblockRequest): UnblockConfirmSubject {
  if (request.action === 'shorten-hold') {
    return { action: request.action, nextHoldSeconds: request.nextHoldSeconds };
  }
  return {
    action: request.action,
    domain: request.domain,
    blockStyle: getBlockStyleLabel(request.timeLimit)
  };
}

/**
 * ブロックを弱める操作を、パスワード保護中はパスワード入力、それ以外は長押し確認を通してから実行させる（パスワードの照合は操作を受けた background が行う）
 * @param isPasswordProtected true ならパスワード入力、false なら長押し確認を求める
 * @returns pending（確認待ちの依頼。無ければ null）・isPasswordModalOpen / isConfirmModalOpen（どちらのモーダルを開くか）・
 *   requestUnblock（依頼を確認待ちにする）・confirm（確認待ちの onConfirm にパスワードを渡して呼び、その結果を返す）・close（確認待ちを片付ける）
 */
export function useUnblockGuard(isPasswordProtected: boolean) {
  const [pending, setPending] = useState<PendingUnblock | null>(null);
  const [mode, setMode] = useState<GuardMode | null>(null);

  const requestUnblock = useCallback(
    (request: UnblockRequest) => {
      setPending({ subject: toSubject(request), onConfirm: request.onConfirm });
      setMode(isPasswordProtected ? 'password' : 'confirm');
    },
    [isPasswordProtected]
  );

  // モーダルは確定時に onConfirm → onClose の順で呼ぶため、後片付けは close に任せる
  const confirm = useCallback(
    async (password?: string): Promise<string | null> =>
      pending ? pending.onConfirm(password) : null,
    [pending]
  );

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
