import React from 'react';
import { getMessage } from '~/lib/i18n';
import { formatTime } from '~/lib/time';

interface RankedListItem {
  domain: string;
  value: number;
}

interface RankedListProps {
  items: RankedListItem[];
  /** 値の表示タイプ（時間 or カウント） */
  valueType: 'time' | 'count';
  /** 背景色（Tailwindクラス） */
  bgColor: string;
  /** テキスト色（Tailwindクラス） */
  textColor: string;
}

/**
 * ランキングリストコンポーネント
 * TopSitesList と TopBlockedSitesList の共通化
 */
export function RankedList({
  items,
  valueType,
  bgColor,
  textColor
}: RankedListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-2">
        {getMessage('noData')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 3).map((item, index) => (
        <div
          key={item.domain}
          className={`flex items-center justify-between p-2 ${bgColor} rounded-lg`}
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 bg-white rounded-full">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
              {item.domain}
            </span>
          </div>
          <span className={`text-sm font-medium ${textColor}`}>
            {valueType === 'time' ? formatTime(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
