import { useState, useCallback } from 'react';

import { getMessage } from '~/lib/i18n';
import { verifyPassword } from '~/lib/password';

interface UsePasswordVerificationOptions {
  passwordHash: string | null;
  onSuccess: () => void | Promise<void>;
}

interface UsePasswordVerificationReturn {
  showModal: boolean;
  passwordInput: string;
  passwordError: string | null;
  showPassword: boolean;
  isVerifying: boolean;
  openModal: () => void;
  closeModal: () => void;
  setPasswordInput: (value: string) => void;
  toggleShowPassword: () => void;
  handleSubmit: () => Promise<void>;
}

/** パスワード確認モーダルの状態と、照合に成功したら onSuccess を呼ぶ送信処理を提供する */
export function usePasswordVerification({
  passwordHash,
  onSuccess
}: UsePasswordVerificationOptions): UsePasswordVerificationReturn {
  const [showModal, setShowModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const resetState = useCallback(() => {
    setPasswordInput('');
    setPasswordError(null);
    setShowPassword(false);
    setIsVerifying(false);
  }, []);

  const openModal = useCallback(() => {
    resetState();
    setShowModal(true);
  }, [resetState]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    resetState();
  }, [resetState]);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!passwordInput || !passwordHash) {
      setPasswordError(getMessage('passwordRequired'));
      return;
    }

    setIsVerifying(true);
    setPasswordError(null);

    try {
      const isValid = await verifyPassword(passwordInput, passwordHash);

      if (isValid) {
        setShowModal(false);
        resetState();
        await onSuccess();
      } else {
        setPasswordError(getMessage('passwordIncorrect'));
      }
    } catch {
      setPasswordError(getMessage('passwordVerificationFailed'));
    } finally {
      setIsVerifying(false);
    }
  }, [passwordInput, passwordHash, onSuccess, resetState]);

  return {
    showModal,
    passwordInput,
    passwordError,
    showPassword,
    isVerifying,
    openModal,
    closeModal,
    setPasswordInput,
    toggleShowPassword,
    handleSubmit
  };
}
