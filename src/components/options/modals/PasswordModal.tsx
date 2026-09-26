import React, { useState, useCallback, useEffect } from 'react';
import { Lock } from 'lucide-react';

import { Modal, Button } from '~/components/ui';
import { PasswordField } from '~/components/options/password';
import { getMessage } from '~/lib/i18n';
import { verifyPassword } from '~/lib/password';

/** PasswordModal に渡す開閉状態・照合先と文言 */
interface PasswordModalProps {
  /** false の間は表示しない。開くたびに入力とエラーを空に戻す */
  isOpen: boolean;
  /** 閉じるときに呼ぶ（照合が通ったあとにも呼ぶ） */
  onClose: () => void;
  /** 入力したパスワードが照合を通ったときに呼ぶ */
  onSuccess: () => void;
  /** 照合に使う保存済みのパスワードのハッシュ */
  passwordHash: string;
  /** 見出し（省略時は「パスワードが必要です」の既定の文言） */
  title?: string;
  /** 見出しの下の説明（省略時は既定の文言） */
  description?: string;
}

/**
 * パスワードを入力させて保存済みのハッシュと照合するモーダルを表示する（Enter でも照合する）
 * @param props 開閉状態・照合先と文言（各フィールドは PasswordModalProps）
 * @returns パスワード入力のモーダル
 */
export function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
  passwordHash,
  title,
  description
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  const canSubmit = !isVerifying && password !== '';

  const handleSubmit = useCallback(async () => {
    if (!password) {
      setError(getMessage('passwordRequired'));
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await verifyPassword(password, passwordHash);

      if (isValid) {
        onSuccess();
        onClose();
      } else {
        setError(getMessage('passwordIncorrect'));
      }
    } catch {
      setError(getMessage('passwordVerificationFailed'));
    } finally {
      setIsVerifying(false);
    }
  }, [password, passwordHash, onSuccess, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && canSubmit) {
        handleSubmit();
      }
    },
    [handleSubmit, canSubmit]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || getMessage('passwordRequired')}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-warning-50 rounded-lg">
          <Lock className="w-5 h-5 text-warning-600 flex-shrink-0" />
          <p className="text-sm text-warning-800">
            {description || getMessage('passwordRequiredDescription')}
          </p>
        </div>

        <div className="space-y-2">
          <PasswordField
            fieldId="password-field-verify"
            label={getMessage('enterPassword')}
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword(!showPassword)}
            placeholder={getMessage('passwordPlaceholder')}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {error && <p className="text-sm text-danger-600">{error}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            data-testid="password-modal-cancel"
          >
            {getMessage('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1"
            data-testid="password-modal-confirm"
          >
            {isVerifying ? getMessage('verifying') : getMessage('confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
