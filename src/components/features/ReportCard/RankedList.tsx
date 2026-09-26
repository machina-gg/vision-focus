import React from 'react';
import { getMessage } from '~/lib/i18n';
import { formatTime } from '~/lib/time';

/** 順位表の 1 行分 */
interface RankedListItem {
  /** サイトのドメイン */
  domain: string;
  /** 並べる基準の値（valueType が 'time' なら秒、'count' なら回数） */
  value: number;
}

/** RankedList に渡す順位表の行と見た目 */
interface RankedListProps {
  /** 上位から並べた行（先頭 3 件だけ出す。空なら「データなし」を出す） */
  items: RankedListItem[];
  /** 値を時間として整形するか、回数のまま出すか */
  valueType: 'time' | 'count';
  /** 各行の背景色のクラス */
  bgColor: string;
  /** 値の文字色のクラス */
  textColor: string;
}

/**
 * サイトの上位 3 件を順位つきで表示する
 * @param props 順位表の行と見た目（各フィールドは RankedListProps）
 * @returns 順位表。行が無ければ「データなし」の文言
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
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 bg-white rounded-full shrink-0">
              {index + 1}
            </span>
            <span
              className="text-sm font-medium text-gray-800 truncate min-w-0 flex-1"
              title={item.domain}
            >
              {item.domain}
            </span>
          </div>
          <span className={`text-sm font-medium ${textColor} shrink-0`}>
            {valueType === 'time' ? formatTime(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
