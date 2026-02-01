import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: {
    button: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translate: 'translate-x-4'
  },
  md: {
    button: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5'
  }
};

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md'
}: ToggleProps) {
  const classes = sizeClasses[size];

  return (
    <label className="inline-flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex ${classes.button} shrink-0
          cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-primary-500' : 'bg-gray-200'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block ${classes.thumb}
            transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${checked ? classes.translate : 'translate-x-0'}
          `}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
    </label>
  );
}
