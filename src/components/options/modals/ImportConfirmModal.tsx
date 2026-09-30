import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Upload } from 'lucide-react';

import { Button, Modal } from '~/components/ui';
import { PasswordField } from '~/components/options/password';
import { getMessage } from '~/lib/i18n';

/** ImportConfirmModal に渡す開閉状態・パスワード欄の要否と取り込みの操作 */
interface ImportConfirmModalProps {
  /** false の間は表示しない。開くたびに入力とエラーを空に戻す */
  isOpen: boolean;
  /** キャンセルボタンか背景が押されたときと、onConfirm が成功したあとに呼ぶ */
  onClose: () => void;
  /** true ならパスワード欄を出し、入力するまで取り込めない */
  requiresPassword: boolean;
  /** 取り込みを依頼する（requiresPassword のときは入力したパスワードを受け取る）。閉じずに出す文言、閉じてよければ null を返す */
  onConfirm: (password?: string) => Promise<string | null>;
}

/**
 * 設定の取り込みですべての設定が上書きされることを確かめるモーダルを表示する（パスワード保護中は同じモーダルでパスワードを入力させる。照合はしない）
 * @param props 開閉状態・パスワード欄の要否と取り込みの操作（各フィールドは ImportConfirmModalProps）
 * @returns 取り込みの確認モーダル
 */
export function ImportConfirmModal({
  isOpen,
  onClose,
  requiresPassword,
  onConfirm
}: ImportConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setError(null);
    }
  }, [isOpen]);

  const canSubmit = !isSubmitting && (!requiresPassword || password !== '');

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const failure = await onConfirm(requiresPassword ? password : undefined);
      if (failure === null) {
        onClose();
      } else {
        setError(failure);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm, onClose, password, requiresPassword]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && canSubmit) {
        void handleSubmit();
      }
    },
    [canSubmit, handleSubmit]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getMessage('importConfirmTitle')}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-warning-50 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <p
            className="text-sm text-warning-800"
            data-testid="import-confirm-message"
          >
            {getMessage('importConfirmMessage')}
          </p>
        </div>

        {requiresPassword && (
          <PasswordField
            fieldId="password-field-import"
            label={getMessage('enterPassword')}
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword(!showPassword)}
            placeholder={getMessage('passwordPlaceholder')}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        )}

        {error && (
          <p
            className="text-sm text-danger-600"
            data-testid="import-confirm-error"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            data-testid="import-confirm-cancel"
          >
            {getMessage('cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            data-testid="import-confirm-submit"
          >
            <Upload className="w-4 h-4" />
            {isSubmitting
              ? getMessage('processing')
              : getMessage('importConfirmButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
