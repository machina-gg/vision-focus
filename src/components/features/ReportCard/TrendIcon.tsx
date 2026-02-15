import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getMessage } from '~/lib/i18n';

interface TrendIconProps {
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * トレンドアイコンコンポーネント
 * 改善・悪化・安定のトレンドを視覚的に表示する
 */
export function TrendIcon({ trend }: TrendIconProps) {
  if (trend === 'improving') {
    return (
      <div className="flex items-center gap-1 text-success-600">
        <TrendingUp className="w-4 h-4" />
        <span className="text-sm font-medium">{getMessage('improving')}</span>
      </div>
    );
  }
  if (trend === 'declining') {
    return (
      <div className="flex items-center gap-1 text-danger-600">
        <TrendingDown className="w-4 h-4" />
        <span className="text-sm font-medium">{getMessage('declining')}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-500">
      <Minus className="w-4 h-4" />
      <span className="text-sm font-medium">{getMessage('stable')}</span>
    </div>
  );
}
