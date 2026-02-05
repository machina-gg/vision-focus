import React from 'react';

import { Toggle } from '~/components/ui';

interface YouTubeFeatureToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function YouTubeFeatureToggle({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false
}: YouTubeFeatureToggleProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        disabled
          ? 'bg-gray-50 opacity-60'
          : checked
            ? 'bg-red-50'
            : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div
        className={`p-1.5 rounded-lg ${checked && !disabled ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4
            className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {title}
          </h4>
          <Toggle
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            size="sm"
          />
        </div>
        <p
          className={`text-xs mt-0.5 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
