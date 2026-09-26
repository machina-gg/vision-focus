import React from 'react';
import {
  Clock,
  Shield,
  Unlock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { getMessage } from '~/lib/i18n';
import { formatTime } from '~/lib/time';

/** StatsGrid に渡す期間の集計値 */
interface StatsGridProps {
  /** 対象サイトで過ごした時間（秒） */
  wasteTime: number;
  /** ブロックした回数 */
  blockCount: number;
  /** ブロックを解除した回数 */
  unblockCount: number;
  /** 前の期間からの時間の増減（%。負なら減少。前の期間のデータが無ければ null） */
  wasteTimeChangePercent: number | null;
}

function formatChangePercent(value: number | null): string {
  if (value === null) {
    return getMessage('noComparisonData');
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

type ChangeDirection = 'improved' | 'worsened' | 'unchanged' | 'unknown';

function getChangeDirection(value: number | null): ChangeDirection {
  if (value === null) return 'unknown';
  if (value < 0) return 'improved';
  if (value > 0) return 'worsened';
  return 'unchanged';
}

function getChangeColor(direction: ChangeDirection) {
  if (direction === 'unknown')
    return {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      label: 'text-gray-500'
    };
  if (direction === 'improved')
    return {
      bg: 'bg-success-50',
      text: 'text-success-700',
      label: 'text-success-600'
    };
  if (direction === 'worsened')
    return {
      bg: 'bg-danger-50',
      text: 'text-danger-700',
      label: 'text-danger-600'
    };
  return { bg: 'bg-gray-50', text: 'text-gray-700', label: 'text-gray-500' };
}

/**
 * 期間の時間・前期間比・ブロック回数・解除回数を 4 つの枠に並べて表示する（時間が減ったら緑、増えたら赤）
 * @param props 期間の集計値（各フィールドは StatsGridProps）
 * @returns 4 列の集計表示
 */
export function StatsGrid({
  wasteTime,
  blockCount,
  unblockCount,
  wasteTimeChangePercent
}: StatsGridProps) {
  const changeDirection = getChangeDirection(wasteTimeChangePercent);
  const changeColors = getChangeColor(changeDirection);

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="text-center p-3 bg-danger-50 rounded-lg">
        <div className="flex items-center justify-center gap-1 text-danger-600 mb-1">
          <Clock className="w-4 h-4" />
        </div>
        <p className="text-lg font-bold text-danger-700">
          {formatTime(wasteTime)}
        </p>
        <p className="text-xs text-danger-600">{getMessage('wasteTime')}</p>
      </div>
      <div
        data-testid="waste-time-change"
        data-change-direction={changeDirection}
        className={`text-center p-3 ${changeColors.bg} rounded-lg`}
      >
        <div
          className={`flex items-center justify-center gap-1 ${changeColors.label} mb-1`}
        >
          {changeDirection === 'improved' ? (
            <TrendingDown className="w-4 h-4" />
          ) : changeDirection === 'worsened' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
        </div>
        <p className={`text-lg font-bold ${changeColors.text}`}>
          {formatChangePercent(wasteTimeChangePercent)}
        </p>
        <p className={`text-xs ${changeColors.label}`}>
          {getMessage('previousPeriodComparison')}
        </p>
      </div>
      <div className="text-center p-3 bg-info-50 rounded-lg">
        <div className="flex items-center justify-center gap-1 text-info-600 mb-1">
          <Shield className="w-4 h-4" />
        </div>
        <p className="text-lg font-bold text-info-700">{blockCount}</p>
        <p className="text-xs text-info-600">{getMessage('blockedCount')}</p>
      </div>
      <div className="text-center p-3 bg-warning-50 rounded-lg">
        <div className="flex items-center justify-center gap-1 text-warning-600 mb-1">
          <Unlock className="w-4 h-4" />
        </div>
        <p className="text-lg font-bold text-warning-700">{unblockCount}</p>
        <p className="text-xs text-warning-600">
          {getMessage('unblockedCount')}
        </p>
      </div>
    </div>
  );
}
