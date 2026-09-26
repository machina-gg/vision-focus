import React from 'react';
import { BarChart3 } from 'lucide-react';

/** EmptyReport に渡す案内文 */
interface EmptyReportProps {
  /** グラフのアイコンの下に出す文言 */
  message: string;
}

/**
 * レポートに出すデータが無いことを、アイコンと案内文で表示する
 * @param props 案内文（各フィールドは EmptyReportProps）
 * @returns 空状態の表示
 */
export function EmptyReport({ message }: EmptyReportProps) {
  return (
    <div className="text-center py-8">
      <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
