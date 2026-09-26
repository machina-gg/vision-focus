import React, { useCallback } from 'react';

import { Select } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type {
  UnblockConfirmSettings,
  UnblockHoldSeconds
} from '~/types/storage';
import { UNBLOCK_HOLD_SECONDS_OPTIONS } from '~/types/storage';

interface UnblockHoldSecondsFieldProps {
  holdSeconds: UnblockHoldSeconds;
  onUpdate: (settings: UnblockConfirmSettings) => Promise<void>;
  /** パスワード保護中は長押し確認が出ないため、選べないことを示す */
  disabled: boolean;
}

export function UnblockHoldSecondsField({
  holdSeconds,
  onUpdate,
  disabled
}: UnblockHoldSecondsFieldProps) {
  const options = UNBLOCK_HOLD_SECONDS_OPTIONS.map((seconds) => ({
    value: String(seconds),
    label: getMessage('unblockHoldSecondsOption', String(seconds))
  }));

  const handleChange = useCallback(
    (value: string) => {
      // 選択肢の外の値は保存しない（長押しの秒数が壊れると解除できなくなるため）
      const selected = UNBLOCK_HOLD_SECONDS_OPTIONS.find(
        (seconds) => String(seconds) === value
      );
      if (selected === undefined) return;
      void onUpdate({ holdSeconds: selected });
    },
    [onUpdate]
  );

  return (
    <div data-testid="unblock-hold-seconds-field">
      {/* select を label で包み、読み上げと検索で項目名が select に結び付くようにする */}
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
    </div>
  );
}
