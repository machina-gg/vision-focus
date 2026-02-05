import { useState, useCallback } from 'react';

import { getMessage } from '~/lib/i18n';
import { verifyPassword } from '~/lib/password';

interface UsePasswordVerificationOptions {
  passwordHash: string | null;
  onSuccess: () => void | Promise<void>;
}

interface UsePasswordVerificationReturn {
  /** Whether the password modal is visible */
  showModal: boolean;
  /** Current password input value */
  passwordInput: string;
  /** Error message to display, or null */
  passwordError: string | null;
  /** Whether the password input is shown as plain text */
  showPassword: boolean;
  /** Whether verification is in progress */
  isVerifying: boolean;
  /** Open the modal and reset state */
  openModal: () => void;
  /** Close the modal and reset state */
  closeModal: () => void;
  /** Update the password input value */
  setPasswordInput: (value: string) => void;
  /** Toggle password visibility */
  toggleShowPassword: () => void;
  /** Submit and verify the password */
  handleSubmit: () => Promise<void>;
}

/**
 * Hook that encapsulates password verification modal state and logic.
 * Manages modal visibility, password input, error handling, and verification
 * using the verifyPassword utility from ~/lib/password.
 */
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
