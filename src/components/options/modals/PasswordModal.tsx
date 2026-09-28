import React, { useState, useCallback, useEffect } from 'react';
import { Lock } from 'lucide-react';

import { Modal, Button } from '~/components/ui';
import { PasswordField } from '~/components/options/password';
import { getMessage } from '~/lib/i18n';

/** PasswordModal に渡す開閉状態・送り先と文言 */
interface PasswordModalProps {
  /** false の間は表示しない。開くたびに入力とエラーを空に戻す */
  isOpen: boolean;
  /** 閉じるときに呼ぶ（onSubmit が成功したあとにも呼ぶ） */
  onClose: () => void;
  /** 入力したパスワードを受け取り、操作を依頼する。失敗なら表示する文言、成功なら null を返す */
  onSubmit: (password: string) => Promise<string | null>;
  /** 見出し（省略時は「パスワードが必要です」の既定の文言） */
  title?: string;
  /** 見出しの下の説明（省略時は既定の文言） */
  description?: string;
}

/**
 * パスワードを入力させて呼び出し元へ渡すモーダルを表示する（照合はしない。Enter でも送る。成功なら閉じ、失敗なら返された文言を出す）
 * @param props 開閉状態・送り先と文言（各フィールドは PasswordModalProps）
 * @returns パスワード入力のモーダル
 */
export function PasswordModal({
  isOpen,
  onClose,
  onSubmit,
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
      const failure = await onSubmit(password);

      if (failure === null) {
        onClose();
      } else {
        setError(failure);
      }
    } catch {
      setError(getMessage('passwordVerificationFailed'));
    } finally {
      setIsVerifying(false);
    }
  }, [password, onSubmit, onClose]);

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
