import React from 'react';

/** Toggle に渡すオン・オフの状態と見た目 */
export interface ToggleProps {
  /** true ならオン */
  checked: boolean;
  /** 押されたときに切り替え後の状態を受け取る */
  onChange: (checked: boolean) => void;
  /** スイッチの右に出す文言（省略時は出さない） */
  label?: string;
  /** true なら切り替えられなくする */
  disabled?: boolean;
  /** スイッチの大きさ（省略時は 'md'） */
  size?: 'sm' | 'md' | 'lg';
  /** スイッチ本体の button に付ける data-testid */
  'data-testid'?: string;
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
  },
  lg: {
    button: 'h-7 w-14',
    thumb: 'h-6 w-6',
    translate: 'translate-x-7'
  }
};

/**
 * オン・オフを切り替えるスイッチを表示する
 * @param props 状態・切り替えの受け取り先・見た目（各フィールドは ToggleProps）
 * @returns スイッチとラベルの要素
 */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  'data-testid': testId
}: ToggleProps) {
  const classes = sizeClasses[size];

  return (
    <label className="inline-flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        data-testid={testId}
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
