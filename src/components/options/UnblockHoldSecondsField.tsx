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
