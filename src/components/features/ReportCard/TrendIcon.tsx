import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getMessage } from '~/lib/i18n';

/** TrendIcon に渡す傾向 */
interface TrendIconProps {
  /** 改善（緑の上向き）・悪化（赤の下向き）・横ばい（灰色）のどれか */
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * 傾向を矢印アイコンと文言で表示する
 * @param props 傾向（各フィールドは TrendIconProps）
 * @returns アイコンと文言の要素
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
