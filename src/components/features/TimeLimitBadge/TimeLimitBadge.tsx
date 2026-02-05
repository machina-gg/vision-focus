import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

import { formatTime } from '~/lib/time';
import { getMessage } from '~/lib/i18n';
import { TIME_LIMIT_CONFIG } from '~/constants/limits';

interface TimeLimitBadgeProps {
  remainingSeconds: number;
  limitSeconds: number;
  limitType: 'daily' | 'hourly';
  showWarning?: boolean;
  compact?: boolean;
}

export function TimeLimitBadge({
  remainingSeconds,
  limitSeconds,
  limitType,
  showWarning = true,
  compact = false
}: TimeLimitBadgeProps) {
  const isLow =
    showWarning &&
    remainingSeconds / limitSeconds <= TIME_LIMIT_CONFIG.WARNING_THRESHOLD;
  const isExceeded = remainingSeconds <= 0;

  if (isExceeded) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger-100 text-danger-700 text-xs rounded-full">
        <AlertTriangle className="w-3 h-3" />
        {getMessage('timeLimitReached')}
      </span>
    );
  }

  const bgColor = isLow ? 'bg-warning-100' : 'bg-info-100';
  const textColor = isLow ? 'text-warning-700' : 'text-info-700';

  const timeDisplay = formatTime(remainingSeconds);
  const suffix =
    limitType === 'daily' ? getMessage('perDay') : getMessage('perHour');

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 ${bgColor} ${textColor} text-xs rounded-full`}
      >
        <Clock className="w-3 h-3" />
        {timeDisplay}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 ${bgColor} ${textColor} text-xs rounded-full`}
    >
      {isLow ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      {isLow
        ? getMessage('timeLimitWarning', timeDisplay)
        : getMessage('timeLimitRemaining', timeDisplay)}
      <span className="opacity-60">{suffix}</span>
    </span>
  );
}
