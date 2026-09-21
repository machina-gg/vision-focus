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
 * 変化が良い方向か悪い方向かを決定
 *
 * 無駄時間の増減なので、減少（負）が改善、増加（正）が悪化にあたる。
 * 色とアイコンの出し分けはこの向きから導くため、判定はここ 1 箇所に置く。
 */
type ChangeDirection = 'improved' | 'worsened' | 'unchanged' | 'unknown';

function getChangeDirection(value: number | null): ChangeDirection {
  if (value === null) return 'unknown';
  if (value < 0) return 'improved';
  if (value > 0) return 'worsened';
  return 'unchanged';
}

/**
 * 変化の向きから色を決定
 * 改善（無駄時間が減少）= 緑、悪化（増加）= 赤
 */
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
 * 統計情報グリッドコンポーネント
 * 無駄時間、変化率、ブロック数、アンブロック数を表示
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
        // 良い方向か悪い方向かが色とアイコンにしか出ないため、属性でも持たせる
        // （machina-gg/vision-focus#455）
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
