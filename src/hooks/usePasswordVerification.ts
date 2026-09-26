import { useState, useCallback } from 'react';

import { getMessage } from '~/lib/i18n';
import { verifyPassword } from '~/lib/password';

interface UsePasswordVerificationOptions {
  /** 照合に使う保存済みのハッシュ。未設定なら null（送信は常に失敗する） */
  passwordHash: string | null;
  /** 照合に成功したとき、モーダルを閉じてから呼ばれる */
  onSuccess: () => void | Promise<void>;
}

interface UsePasswordVerificationReturn {
  /** モーダルを表示中か */
  showModal: boolean;
  /** 入力中のパスワード */
  passwordInput: string;
  /** 表示する失敗の文言。失敗していなければ null */
  passwordError: string | null;
  /** 入力中のパスワードを伏せ字にせず表示するか */
  showPassword: boolean;
  /** 照合中か */
  isVerifying: boolean;
  /** 入力を消してモーダルを開く */
  openModal: () => void;
  /** モーダルを閉じて入力を消す */
  closeModal: () => void;
  /** 入力中のパスワードを変える */
  setPasswordInput: (value: string) => void;
  /** 伏せ字の表示を切り替える */
  toggleShowPassword: () => void;
  /** 入力を照合する。成功ならモーダルを閉じて onSuccess を呼び、失敗なら passwordError に文言を入れる */
  handleSubmit: () => Promise<void>;
}

/**
 * パスワード確認モーダルの状態と、照合に成功したら onSuccess を呼ぶ送信処理を提供する
 * @param options フックの入力（下記の項目）
 * @param options.passwordHash 照合に使う保存済みのハッシュ。未設定なら null
 * @param options.onSuccess 照合に成功したときに呼ぶ処理
 * @returns モーダルの状態と、開閉・入力・送信の操作
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
