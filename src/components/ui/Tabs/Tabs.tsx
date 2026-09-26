import type { ReactNode } from 'react';
import React from 'react';

/** タブ 1 つ分の識別子と表示内容 */
export interface Tab {
  /** タブの識別子（data-testid は `tab-${id}` になる） */
  id: string;
  /** タブに表示する文言 */
  label: string;
  /** 文言の前に出すアイコン */
  icon?: ReactNode;
}

/** Tabs に渡すタブの一覧と選択状態 */
export interface TabsProps {
  /** 左から並べるタブ */
  tabs: Tab[];
  /** 選択中のタブの id */
  activeTab: string;
  /** タブが押されたときにその id を受け取る */
  onChange: (tabId: string) => void;
  /** 外側の div に足すクラス */
  className?: string;
}

/**
 * 横並びのタブを表示し、選択中のタブに下線を引く
 * @param props タブの一覧・選択中の id・切り替えの受け取り先（各フィールドは TabsProps）
 * @returns タブの並び
 */
export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="flex gap-4" aria-label="Tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-1 py-3
              text-sm font-medium border-b-2 -mb-px
              transition-colors duration-200
              ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
