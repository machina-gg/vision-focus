import React from 'react';

import { Button } from '~/components/ui';
import type { ButtonProps } from '~/components/ui/Button/Button';
import { getMessage } from '~/lib/i18n';

interface FormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled: boolean;
  isProcessing: boolean;
  submitVariant?: ButtonProps['variant'];
}

/** Cancel/Submit button pair for password forms */
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
      <Button variant="secondary" onClick={onCancel} className="flex-1">
        {getMessage('cancel')}
      </Button>
      <Button
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
