import { useCallback, useState } from 'react';

import { getMessage } from '~/lib/i18n';
import type { TimeLimit } from '~/types/storage';

export type UnblockAction = 'toggle' | 'delete';

export interface UnblockRequest {
  domain: string;
  timeLimit: TimeLimit | null | undefined;
  action: UnblockAction;
  onConfirm: () => void;
}

export interface PendingUnblock extends UnblockRequest {
  blockStyle: string;
}

type GuardMode = 'password' | 'confirm';

export function getBlockStyleLabel(
  timeLimit: TimeLimit | null | undefined
): string {
  return getMessage(timeLimit ? 'dailyLimit' : 'alwaysBlocked');
}

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
