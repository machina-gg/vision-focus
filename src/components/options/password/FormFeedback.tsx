import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

/** FormFeedback に渡す結果の文言 */
interface FormFeedbackProps {
  /** 赤字で出す失敗の文言（null なら出さない） */
  error: string | null;
  /** 緑字で出す成功の文言（null なら出さない） */
  success: string | null;
}

/**
 * パスワードのフォームの操作結果を、失敗なら警告アイコン、成功ならチェックつきで表示する
 * @param props 結果の文言（各フィールドは FormFeedbackProps）
 * @returns 失敗・成功の文言。どちらも null なら何も描画しない
 */
export function FormFeedback({ error, success }: FormFeedbackProps) {
  return (
    <>
      {error && (
        <div className="flex items-center gap-2 text-sm text-danger-600">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-success-600">
          <Check className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}
    </>
  );
}
