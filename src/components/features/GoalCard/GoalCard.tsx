import React, { useState } from 'react';

import { Edit2, Target } from 'lucide-react';

import { Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

export interface GoalCardProps {
  goalText: string;
  onClick?: () => void;
  editable?: boolean;
  onEdit?: (text: string) => void;
}

export function GoalCard({
  goalText,
  onClick,
  editable = false,
  onEdit
}: GoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(goalText);

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
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 p-2 bg-primary-100 rounded-lg">
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
              className="w-full p-2 text-base font-medium text-gray-800 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary-500 resize-none"
              rows={2}
              autoFocus
            />
          ) : (
            <p className="text-base font-medium text-gray-800 line-clamp-2">
              {goalText}
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
