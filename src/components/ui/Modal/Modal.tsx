import type { ReactNode } from 'react';
import React from 'react';

import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg';

/** Modal に渡す開閉状態・見出し・中身 */
export interface ModalProps {
  /** false の間は何も描画しない */
  isOpen: boolean;
  /** 背景か閉じるボタンが押されたときに呼ぶ */
  onClose: () => void;
  /** 見出し（省略時は見出しと閉じるボタンの帯を出さない） */
  title?: string;
  /** ダイアログの最大幅（省略時は 'md'） */
  size?: ModalSize;
  /** ダイアログの本文 */
  children: ReactNode;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg'
};

/**
 * 画面全体を暗くした上にダイアログを重ねて表示する
 * @param props 開閉状態・見出し・中身（各フィールドは ModalProps）
 * @returns ダイアログの要素。閉じているときは null
 */
export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        data-size={size}
        className={`
          relative w-full mx-4
          bg-white rounded-2xl shadow-xl
          ${sizeStyles[size]}
        `}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
