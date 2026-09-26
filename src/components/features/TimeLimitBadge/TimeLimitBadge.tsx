import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

import { formatTime, formatTimeLocalized } from '~/lib/time';
import { getMessage } from '~/lib/i18n';
import { TIME_LIMIT_CONFIG } from '~/constants/limits';

/** TimeLimitBadge に渡す残り時間と表示の形 */
interface TimeLimitBadgeProps {
  /** その日の残り時間（秒。0 以下なら上限到達として表示する） */
  remainingSeconds: number;
  /** 1 日の上限（秒。残りの割合の計算に使う） */
  limitSeconds: number;
  /** false なら残りが少なくても警告の色にしない（省略時は警告する） */
  showWarning?: boolean;
  /** true なら「1 日あたり」の添え字を省き、残り時間を表示言語の書き方で出す */
  compact?: boolean;
}

/**
 * 時間制限の残り時間をバッジで表示する（残りの割合が警告のしきい値以下なら黄色、使い切ったら赤）
 * @param props 残り時間と表示の形（各フィールドは TimeLimitBadgeProps）
 * @returns 残り時間か上限到達を示すバッジ
 */
export function TimeLimitBadge({
  remainingSeconds,
  limitSeconds,
  showWarning = true,
  compact = false
}: TimeLimitBadgeProps) {
  const isLow =
    showWarning &&
    remainingSeconds / limitSeconds <= TIME_LIMIT_CONFIG.WARNING_THRESHOLD;
  const isExceeded = remainingSeconds <= 0;

  if (isExceeded) {
    return (
      <span
        data-testid="time-limit-badge"
        data-state="exceeded"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger-100 text-danger-700 text-xs rounded-full"
      >
        <AlertTriangle className="w-3 h-3" />
        {getMessage('timeLimitReached')}
      </span>
    );
  }

  const bgColor = isLow ? 'bg-warning-100' : 'bg-info-100';
  const textColor = isLow ? 'text-warning-700' : 'text-info-700';

  const timeDisplay = formatTime(remainingSeconds);
  const timeDisplayLocalized = formatTimeLocalized(remainingSeconds);
  const suffix = getMessage('perDay');

  if (compact) {
    return (
      <span
        data-testid="time-limit-badge"
        data-state="remaining"
        data-low={String(isLow)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 ${bgColor} ${textColor} text-xs rounded-full`}
      >
        <Clock className="w-3 h-3" />
        {getMessage('timeLimitRemaining', timeDisplayLocalized)}
      </span>
    );
  }

  return (
    <span
      data-testid="time-limit-badge"
      data-state="remaining"
      data-low={String(isLow)}
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
