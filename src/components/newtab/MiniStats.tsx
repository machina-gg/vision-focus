import React from 'react';
import { Ban, Calendar, TrendingUp } from 'lucide-react';

import { getMessage } from '~/lib/i18n';

/** MiniStats に渡す今日の数値と操作 */
interface MiniStatsProps {
  /** 今日ブロックした回数 */
  blockCount: number;
  /** ブロックされたサイトをブロックリストに入れてからの日数（null なら枠を出さない） */
  blockingDays: number | null;
  /** 分析を見るボタンが押されたときに呼ぶ（省略時はボタンを出さない） */
  onAnalyticsClick?: () => void;
}

/**
 * 今日のブロック回数とブロックを続けている日数を小さな枠で表示する
 * @param props 今日の数値と操作（各フィールドは MiniStatsProps）
 * @returns 数値の枠と分析を見るボタンをまとめた要素
 */
export function MiniStats({
  blockCount,
  blockingDays,
  onAnalyticsClick
}: MiniStatsProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex justify-center gap-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
          <div className="flex items-center justify-center gap-2 text-block-500 mb-1">
            <Ban className="w-4 h-4" />
            <span className="text-xs font-medium">
              {getMessage('todayBlocks')}
            </span>
          </div>
          <p
            className="text-xl font-bold text-block-600"
            data-testid="newtab-block-count"
          >
            {blockCount}
          </p>
        </div>

        {blockingDays !== null && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 min-w-[120px]">
            <div className="flex items-center justify-center gap-2 text-info-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">
                {getMessage('blockingDays')}
              </span>
            </div>
            <p
              className="text-xl font-bold text-info-600"
              data-testid="newtab-blocking-days"
            >
              {getMessage('blockedForDays', blockingDays.toString())}
            </p>
          </div>
        )}
      </div>

      {onAnalyticsClick && (
        <button
          onClick={onAnalyticsClick}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          {getMessage('viewAnalytics')}
        </button>
      )}
    </div>
  );
}
