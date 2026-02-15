import React from 'react';
import { BarChart3 } from 'lucide-react';

interface EmptyReportProps {
  message: string;
}

/**
 * 空のレポート状態を表示するコンポーネント
 */
export function EmptyReport({ message }: EmptyReportProps) {
  return (
    <div className="text-center py-8">
      <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
