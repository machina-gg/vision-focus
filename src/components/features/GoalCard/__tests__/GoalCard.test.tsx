import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { GoalCard } from '../GoalCard';

function editButtonOf(container: HTMLElement): HTMLElement {
  const button = container.querySelector('button');
  if (!button) throw new Error('編集ボタンが見つからない');
  return button;
}

describe('GoalCard', () => {
  describe('目標の表示', () => {
    it('目標が設定されていればその文字列を表示する', () => {
      render(<GoalCard goalText="今日の目標" />);

      expect(screen.getByTestId('goal-card-text')).toHaveTextContent(
        '今日の目標'
      );
    });

    it('目標が空文字なら設定を促す案内を表示する', () => {
      render(<GoalCard goalText="" />);

      expect(screen.getByTestId('goal-card-text')).toHaveTextContent(
        'noGoalSet'
      );
    });

    it('目標が空白のみでも設定を促す案内を表示する', () => {
      render(<GoalCard goalText="   " />);

      expect(screen.getByTestId('goal-card-text')).toHaveTextContent(
        'noGoalSet'
      );
    });
  });

  describe('カードのクリック', () => {
    it('クリックで onClick が呼ばれる', () => {
      const onClick = vi.fn();
      render(<GoalCard goalText="目標" onClick={onClick} />);

      fireEvent.click(screen.getByTestId('goal-card'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('編集中はカードをクリックしても onClick は呼ばれない', () => {
      const onClick = vi.fn();
      const { container } = render(
        <GoalCard goalText="目標" onClick={onClick} editable />
      );

      fireEvent.click(editButtonOf(container));
      fireEvent.click(screen.getByTestId('goal-card'));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('編集', () => {
    it('editable が false（既定）なら編集ボタンは表示されない', () => {
      const { container } = render(<GoalCard goalText="目標" />);

      expect(container.querySelector('button')).toBeNull();
    });

    it('編集ボタンを押すと現在の目標が入った入力欄になる', () => {
      const { container } = render(<GoalCard goalText="目標" editable />);

      fireEvent.click(editButtonOf(container));

      expect(screen.getByRole('textbox')).toHaveValue('目標');
    });

    it('Enter で onEdit が編集後の文字列とともに呼ばれる', () => {
      const onEdit = vi.fn();
      const { container } = render(
        <GoalCard goalText="目標" editable onEdit={onEdit} />
      );

      fireEvent.click(editButtonOf(container));
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '新しい目標' }
      });
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

      expect(onEdit).toHaveBeenCalledWith('新しい目標');
      expect(screen.getByTestId('goal-card-text')).toHaveTextContent('目標');
    });

    it('Shift + Enter では保存されない（改行のため）', () => {
      const onEdit = vi.fn();
      const { container } = render(
        <GoalCard goalText="目標" editable onEdit={onEdit} />
      );

      fireEvent.click(editButtonOf(container));
      fireEvent.keyDown(screen.getByRole('textbox'), {
        key: 'Enter',
        shiftKey: true
      });

      expect(onEdit).not.toHaveBeenCalled();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('Escape で編集を取り消し、onEdit は呼ばれない', () => {
      const onEdit = vi.fn();
      const { container } = render(
        <GoalCard goalText="目標" editable onEdit={onEdit} />
      );

      fireEvent.click(editButtonOf(container));
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '破棄される文字列' }
      });
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

      expect(onEdit).not.toHaveBeenCalled();
      expect(screen.getByTestId('goal-card-text')).toHaveTextContent('目標');
    });

    it('入力欄からフォーカスが外れると onEdit が呼ばれる', () => {
      const onEdit = vi.fn();
      const { container } = render(
        <GoalCard goalText="目標" editable onEdit={onEdit} />
      );

      fireEvent.click(editButtonOf(container));
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '確定する目標' }
      });
      fireEvent.blur(screen.getByRole('textbox'));

      expect(onEdit).toHaveBeenCalledWith('確定する目標');
    });

    it('onEdit を渡さなくても保存操作で例外にならない', () => {
      const { container } = render(<GoalCard goalText="目標" editable />);

      fireEvent.click(editButtonOf(container));
      fireEvent.blur(screen.getByRole('textbox'));

      expect(screen.getByTestId('goal-card-text')).toBeInTheDocument();
    });
  });
});
