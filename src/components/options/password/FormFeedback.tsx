import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

interface FormFeedbackProps {
  error: string | null;
  success: string | null;
}

/** Displays error and success feedback messages for password forms */
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
