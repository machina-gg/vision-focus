import React from 'react';
import { Edit2 } from 'lucide-react';

import { Button, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

/** GoalDisplay に渡す目標の表示内容と編集の状態・操作 */
interface GoalDisplayProps {
  /** 目標（空白だけなら「目標未設定」の案内を出す） */
  goalText: string;
  /** 目標の下に出す補足（空なら出さない。改行はそのまま出す） */
  goalSubText: string;
  /** 目標と補足の文字色（CSS の色） */
  textColor: string;
  /** 目標に当てるフォントの指定 */
  fontStyle: React.CSSProperties;
  /** true なら入力欄と保存・取消ボタンを出す */
  isEditing: boolean;
  /** 編集中の入力欄の文言 */
  editText: string;
  /** true ならホバー時に編集ボタンを出す */
  canEdit: boolean;
  /** 入力欄の文言が変わったときに受け取る */
  onEditTextChange: (text: string) => void;
  /** 編集ボタンが押されたときに呼ぶ */
  onStartEdit: () => void;
  /** 保存ボタンが押されたときに呼ぶ */
  onSave: () => void;
  /** 取消ボタンが押されたときに呼ぶ */
  onCancel: () => void;
  /** 入力欄でキーが押されたときに受け取る */
  onKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * 新しいタブの中央に目標と補足を大きく表示し、編集中は入力欄に切り替える（編集の状態は呼び出し側が持つ）
 * @param props 表示内容と編集の状態・操作（各フィールドは GoalDisplayProps）
 * @returns 目標の見出しと補足、または入力欄と保存・取消ボタン
 */
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
          data-testid="newtab-goal-input"
          value={editText}
          onChange={onEditTextChange}
          onKeyDown={onKeyDown}
          placeholder={getMessage('enterGoalPlaceholder')}
          className="text-center text-2xl bg-white/90"
          autoFocus
        />
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            data-testid="newtab-goal-cancel"
          >
            {getMessage('cancel')}
          </Button>
          <Button onClick={onSave} data-testid="newtab-goal-save">
            {getMessage('save')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <h1
        data-testid="newtab-goal-text"
        className={`drop-shadow-lg leading-tight transition-opacity duration-300 ${
          goalText.trim() ? '' : 'opacity-60 italic'
        }`}
        style={{ color: textColor, ...fontStyle }}
      >
        {goalText.trim() ? goalText : getMessage('noGoalSet')}
      </h1>
      {goalSubText && (
        <p
          className="text-lg md:text-xl mt-4 drop-shadow-lg opacity-80 whitespace-pre-line"
          style={{ color: textColor }}
        >
          {goalSubText}
        </p>
      )}

      {canEdit && (
        <button
          data-testid="newtab-goal-edit-button"
          onClick={onStartEdit}
          className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
