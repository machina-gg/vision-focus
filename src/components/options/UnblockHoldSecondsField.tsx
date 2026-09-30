import React, { useCallback } from 'react';

import { UnblockConfirmModal } from '~/components/options/modals';
import { Select } from '~/components/ui';
import { useUnblockGuard } from '~/hooks/useUnblockGuard';
import { getMessage } from '~/lib/i18n';
import type {
  UnblockConfirmSettings,
  UnblockHoldSeconds
} from '~/types/storage';
import { UNBLOCK_HOLD_SECONDS_OPTIONS } from '~/types/storage';

/** UnblockHoldSecondsField に渡す現在の秒数と保存先 */
interface UnblockHoldSecondsFieldProps {
  /** 解除の確認で長押しさせる現在の秒数 */
  holdSeconds: UnblockHoldSeconds;
  /** 選び直した秒数を確認設定として保存する（短くするときは長押しの確認を通ってから呼ぶ。完了は待たない） */
  onUpdate: (settings: UnblockConfirmSettings) => Promise<void>;
  /** true なら選べなくし、パスワード保護中である旨の注記を出す */
  disabled: boolean;
}

/**
 * 解除の確認で長押しさせる秒数を、決められた選択肢から選ぶ欄を表示する（今より短い秒数は、今の秒数の長押しの確認を通ってから保存する。やめたら値は変えない）
 * @param props 現在の秒数と保存先（各フィールドは UnblockHoldSecondsFieldProps）
 * @returns 秒数のプルダウンと注記、短くするときの長押しの確認モーダル
 */
export function UnblockHoldSecondsField({
  holdSeconds,
  onUpdate,
  disabled
}: UnblockHoldSecondsFieldProps) {
  // パスワード保護中は欄を選べないので、確認は長押しだけになる
  const guard = useUnblockGuard(false);
  const { requestUnblock } = guard;
  const options = UNBLOCK_HOLD_SECONDS_OPTIONS.map((seconds) => ({
    value: String(seconds),
    label: getMessage('unblockHoldSecondsOption', String(seconds))
  }));

  const handleChange = useCallback(
    (value: string) => {
      const selected = UNBLOCK_HOLD_SECONDS_OPTIONS.find(
        (seconds) => String(seconds) === value
      );
      if (selected === undefined) return;
      if (selected >= holdSeconds) {
        void onUpdate({ holdSeconds: selected });
        return;
      }
      requestUnblock({
        action: 'shorten-hold',
        nextHoldSeconds: selected,
        onConfirm: async () => {
          await onUpdate({ holdSeconds: selected });
          return null;
        }
      });
    },
    [holdSeconds, onUpdate, requestUnblock]
  );

  return (
    <div data-testid="unblock-hold-seconds-field">
      <label className="block">
        <span className="block text-sm font-medium text-gray-600 mb-2">
          {getMessage('unblockHoldSeconds')}
        </span>
        <Select
          value={String(holdSeconds)}
          onChange={handleChange}
          options={options}
          disabled={disabled}
          className="w-48"
        />
      </label>
      {disabled && (
        <p
          className="mt-2 text-sm text-gray-500"
          data-testid="unblock-hold-seconds-password-note"
        >
          {getMessage('unblockHoldSecondsPasswordNote')}
        </p>
      )}
      {guard.pending && (
        <UnblockConfirmModal
          isOpen={guard.isConfirmModalOpen}
          onClose={guard.close}
          onConfirm={() => void guard.confirm()}
          subject={guard.pending.subject}
          holdSeconds={holdSeconds}
        />
      )}
    </div>
  );
}
