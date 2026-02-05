import type { ReactNode } from 'react';
import React from 'react';

type StatsType = 'waste' | 'invest' | 'block' | 'neutral';

export interface StatsCardProps {
  label: string;
  value: string;
  type?: StatsType;
  icon?: ReactNode;
}

const typeStyles: Record<
  StatsType,
  { bg: string; text: string; icon: string }
> = {
  waste: {
    bg: 'bg-danger-50',
    text: 'text-danger-600',
    icon: 'text-danger-500'
  },
  invest: {
    bg: 'bg-success-50',
    text: 'text-success-600',
    icon: 'text-success-500'
  },
  block: { bg: 'bg-block-50', text: 'text-block-600', icon: 'text-block-500' },
  neutral: { bg: 'bg-gray-50', text: 'text-gray-600', icon: 'text-gray-500' }
};

export function StatsCard({
  label,
  value,
  type = 'neutral',
  icon
}: StatsCardProps) {
  const styles = typeStyles[type];

  return (
    <div className={`${styles.bg} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${styles.text}`}>{value}</p>
    </div>
  );
}
