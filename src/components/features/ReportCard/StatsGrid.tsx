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

interface StatsGridProps {
  wasteTime: number;
  blockCount: number;
  unblockCount: number;
  wasteTimeChangePercent: number | null;
}

/**
 * 変化率を表示用にフォーマット
 */
function formatChangePercent(value: number | null): string {
  if (value === null) {
    return getMessage('noComparisonData');
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * 変化率の色を決定
 * ネガティブ（無駄時間が減少）= 緑、ポジティブ（増加）= 赤
 */
function getChangeColor(value: number | null) {
  if (value === null)
    return {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      label: 'text-gray-500'
    };
  if (value < 0)
    return {
      bg: 'bg-success-50',
      text: 'text-success-700',
      label: 'text-success-600'
    };
  if (value > 0)
    return {
      bg: 'bg-danger-50',
      text: 'text-danger-700',
      label: 'text-danger-600'
    };
  return { bg: 'bg-gray-50', text: 'text-gray-700', label: 'text-gray-500' };
}

/**
 * 統計情報グリッドコンポーネント
 * 無駄時間、変化率、ブロック数、アンブロック数を表示
 */
export function StatsGrid({
  wasteTime,
  blockCount,
  unblockCount,
  wasteTimeChangePercent
}: StatsGridProps) {
  const changeColors = getChangeColor(wasteTimeChangePercent);

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
      <div className={`text-center p-3 ${changeColors.bg} rounded-lg`}>
        <div
          className={`flex items-center justify-center gap-1 ${changeColors.label} mb-1`}
        >
          {wasteTimeChangePercent !== null && wasteTimeChangePercent < 0 ? (
            <TrendingDown className="w-4 h-4" />
          ) : wasteTimeChangePercent !== null && wasteTimeChangePercent > 0 ? (
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
