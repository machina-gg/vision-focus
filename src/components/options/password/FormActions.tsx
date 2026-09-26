import React from 'react';

import { Button } from '~/components/ui';
import type { ButtonProps } from '~/components/ui/Button/Button';
import { getMessage } from '~/lib/i18n';

/** FormActions に渡す取消・実行の操作と実行ボタンの見た目 */
interface FormActionsProps {
  /** 取消ボタンが押されたときに呼ぶ */
  onCancel: () => void;
  /** 実行ボタンが押されたときに呼ぶ */
  onSubmit: () => void;
  /** 実行ボタンの文言 */
  submitLabel: string;
  /** true なら実行ボタンを押せなくする */
  submitDisabled: boolean;
  /** true の間は実行ボタンの文言を「処理中」に替える */
  isProcessing: boolean;
  /** 実行ボタンの色の種類（省略時は Button の既定） */
  submitVariant?: ButtonProps['variant'];
}

/**
 * パスワードのフォームの下に、取消ボタンと実行ボタンを横並びで表示する
 * @param props 取消・実行の操作と実行ボタンの見た目（各フィールドは FormActionsProps）
 * @returns ボタンの並び
 */
export function FormActions({
  onCancel,
  onSubmit,
  submitLabel,
  submitDisabled,
  isProcessing,
  submitVariant
}: FormActionsProps) {
  return (
    <div className="flex gap-3">
      <Button
        variant="secondary"
        onClick={onCancel}
        className="flex-1"
        data-testid="password-form-cancel"
      >
        {getMessage('cancel')}
      </Button>
      <Button
        data-testid="password-form-submit"
        variant={submitVariant}
        onClick={onSubmit}
        disabled={submitDisabled}
        className="flex-1"
      >
        {isProcessing ? getMessage('processing') : submitLabel}
      </Button>
    </div>
  );
}
