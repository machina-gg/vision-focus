import React, { useState, useCallback, useEffect } from 'react';
import { Lock } from 'lucide-react';

import { Modal, Button } from '~/components/ui';
import { PasswordField } from '~/components/options/password';
import { getMessage } from '~/lib/i18n';
import { verifyPassword } from '~/lib/password';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  passwordHash: string;
  title?: string;
  description?: string;
}

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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  // 送信できるかどうかの判定はここ 1 つだけを使う。
  // ボタンの無効化と Enter キーが別々の条件を持つと、片方だけが未入力を
  // 通してしまうずれが再発する（machina-gg/vision-focus#465）
  const canSubmit = !isVerifying && password !== '';

  const handleSubmit = useCallback(async () => {
    // 受け取る側の検査。canSubmit（押せるかどうか）とは役割が別で、
    // 送信の経路が増えても空のまま照合へ進ませない
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
          {/*
            入力欄は共通の部品に寄せる。ラベルと入力欄の結び付き、表示切り替え
            ボタンの名前がこれで他のパスワード欄と揃う
            （machina-gg/vision-focus#468 / #476）
          */}
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
