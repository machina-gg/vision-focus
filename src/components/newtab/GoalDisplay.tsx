import React from 'react';
import { Edit2 } from 'lucide-react';

import { Button, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

interface GoalDisplayProps {
  goalText: string;
  goalSubText: string;
  textColor: string;
  fontStyle: React.CSSProperties;
  isEditing: boolean;
  editText: string;
  canEdit: boolean;
  onEditTextChange: (text: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function GoalDisplay({
  goalText,
  goalSubText,
  textColor,
  fontStyle,
  isEditing,
  editText,
  canEdit,
  onEditTextChange,
  onStartEdit,
  onSave,
  onCancel,
  onKeyDown
}: GoalDisplayProps) {
  if (isEditing) {
    return (
      <div className="space-y-4">
        <Input
          value={editText}
          onChange={onEditTextChange}
          onKeyDown={onKeyDown}
          placeholder={getMessage('enterGoalPlaceholder')}
          className="text-center text-2xl bg-white/90"
          autoFocus
        />
        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {getMessage('cancel')}
          </Button>
          <Button onClick={onSave}>{getMessage('save')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <h1
        className="drop-shadow-lg leading-tight transition-opacity duration-300"
        style={{ color: textColor, ...fontStyle }}
      >
        {goalText}
      </h1>
      {goalSubText && (
        <p
          className="text-lg md:text-xl mt-4 drop-shadow-lg opacity-80 whitespace-pre-line"
          style={{ color: textColor }}
        >
          {goalSubText}
        </p>
      )}

      {/* Edit button - only show when no preset is active */}
      {canEdit && (
        <button
          onClick={onStartEdit}
          className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
