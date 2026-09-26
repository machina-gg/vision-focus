import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { GoalDisplay } from '../GoalDisplay';

const baseProps = {
  goalText: '今日の目標',
  goalSubText: '',
  textColor: '#ffffff',
  fontStyle: {},
  isEditing: false,
  editText: '',
  canEdit: false,
  onEditTextChange: vi.fn(),
  onStartEdit: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onKeyDown: vi.fn()
};

describe('GoalDisplay', () => {
  describe('目標の表示', () => {
    it('目標が設定されていればその文字列を表示する', () => {
      render(<GoalDisplay {...baseProps} goalText="今日の目標" />);

      expect(screen.getByTestId('newtab-goal-text')).toHaveTextContent(
        '今日の目標'
      );
    });

    it('目標が空文字なら設定を促す案内を表示する', () => {
      render(<GoalDisplay {...baseProps} goalText="" />);

      expect(screen.getByTestId('newtab-goal-text')).toHaveTextContent(
        'noGoalSet'
      );
    });

    it('目標が空白のみでも設定を促す案内を表示する', () => {
      render(<GoalDisplay {...baseProps} goalText="   " />);

      expect(screen.getByTestId('newtab-goal-text')).toHaveTextContent(
        'noGoalSet'
      );
    });

    it('指定した文字色が見出しに反映される', () => {
      render(<GoalDisplay {...baseProps} textColor="rgb(255, 0, 0)" />);

      expect(screen.getByTestId('newtab-goal-text')).toHaveStyle({
        color: 'rgb(255, 0, 0)'
      });
    });
  });

  describe('サブテキスト', () => {
    it('空文字なら表示しない', () => {
      render(<GoalDisplay {...baseProps} goalSubText="" />);

      expect(screen.queryByText('補足')).not.toBeInTheDocument();
    });

    it('設定されていれば表示する', () => {
      render(<GoalDisplay {...baseProps} goalSubText="補足" />);

      expect(screen.getByText('補足')).toBeInTheDocument();
    });
  });

  describe('編集ボタン', () => {
    it('canEdit が false なら編集ボタンは表示されない', () => {
      render(<GoalDisplay {...baseProps} canEdit={false} />);

      expect(
        screen.queryByTestId('newtab-goal-edit-button')
      ).not.toBeInTheDocument();
    });

    it('canEdit が true なら編集ボタンを表示し、クリックで onStartEdit が呼ばれる', () => {
      const onStartEdit = vi.fn();
      render(<GoalDisplay {...baseProps} canEdit onStartEdit={onStartEdit} />);

      fireEvent.click(screen.getByTestId('newtab-goal-edit-button'));

      expect(onStartEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('編集中', () => {
    it('入力欄に editText が入り、見出しは表示されない', () => {
      render(<GoalDisplay {...baseProps} isEditing editText="編集中の値" />);

      expect(screen.getByTestId('newtab-goal-input')).toHaveValue('編集中の値');
      expect(screen.queryByTestId('newtab-goal-text')).not.toBeInTheDocument();
    });

    it('入力すると onEditTextChange が入力値とともに呼ばれる', () => {
      const onEditTextChange = vi.fn();
      render(
        <GoalDisplay
          {...baseProps}
          isEditing
          editText=""
          onEditTextChange={onEditTextChange}
        />
      );

      fireEvent.change(screen.getByTestId('newtab-goal-input'), {
        target: { value: '新しい目標' }
      });

      expect(onEditTextChange).toHaveBeenCalledWith('新しい目標');
    });

    it('キー入力が onKeyDown へ渡る', () => {
      const onKeyDown = vi.fn();
      render(<GoalDisplay {...baseProps} isEditing onKeyDown={onKeyDown} />);

      fireEvent.keyDown(screen.getByTestId('newtab-goal-input'), {
        key: 'Enter'
      });

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onKeyDown.mock.calls[0][0]).toMatchObject({ key: 'Enter' });
    });

    it('保存ボタンで onSave、取消ボタンで onCancel が呼ばれる', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <GoalDisplay
          {...baseProps}
          isEditing
          onSave={onSave}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByTestId('newtab-goal-save'));
      expect(onSave).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('newtab-goal-cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
