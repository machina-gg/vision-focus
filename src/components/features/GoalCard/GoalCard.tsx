import React, { useState } from 'react';

import { Edit2, Target } from 'lucide-react';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

/** GoalCard に渡す目標の文言と操作 */
export interface GoalCardProps {
  /** 今日の目標（空白だけなら「目標未設定」の案内を出す） */
  goalText: string;
  /** 編集中でないときにカードが押されたら呼ぶ */
  onClick?: () => void;
  /** true ならホバー時に編集ボタンを出す */
  editable?: boolean;
  /** 編集を確定したとき（Enter かフォーカスが外れたとき）に入力した文言を受け取る */
  onEdit?: (text: string) => void;
}

/**
 * 今日の目標をカードに表示し、編集できる場合はその場で書き換えられるようにする
 * @param props 目標の文言と操作（各フィールドは GoalCardProps。Esc で編集を取り消す）
 * @returns 目標のカード
 */
export function GoalCard({
  goalText,
  onClick,
  editable = false,
  onEdit
}: GoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(goalText);

  const hasGoal = goalText.trim().length > 0;

  const handleSave = () => {
    onEdit?.(editText);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditText(goalText);
      setIsEditing(false);
    }
  };

  return (
    <Card
      variant="elevated"
      padding="md"
      onClick={!isEditing ? onClick : undefined}
      className="relative group"
      data-testid="goal-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-primary-100 rounded-lg">
          <Target className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 mb-1">
            {getMessage('todaysGoal')}
          </p>
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full p-2 text-base font-medium text-gray-800 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={2}
              autoFocus
            />
          ) : (
            <p
              data-testid="goal-card-text"
              className={`text-base line-clamp-2 ${
                hasGoal ? 'font-medium text-gray-800' : 'text-gray-400 italic'
              }`}
            >
              {hasGoal ? goalText : getMessage('noGoalSet')}
            </p>
          )}
        </div>
        {editable && !isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </Card>
  );
}
