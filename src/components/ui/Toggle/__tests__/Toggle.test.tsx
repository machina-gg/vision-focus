import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Toggle } from '../Toggle';

/**
 * Toggle の表示分岐とコールバックの検査
 *
 * 一時停止・YouTube 設定・パスワード保護といった「効いているか」が
 * 見た目だけで判断される場所で使われるため、checked の値が
 * aria-checked に出ていることと、押したときに反転した値が渡ることを確かめる。
 */
describe('Toggle', () => {
  describe('状態の表示', () => {
    it('checked が true なら aria-checked も true になる', () => {
      render(<Toggle checked onChange={vi.fn()} />);

      expect(screen.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('checked が false なら aria-checked も false になる', () => {
      render(<Toggle checked={false} onChange={vi.fn()} />);

      expect(screen.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('checked が後から変わると aria-checked も追従する', () => {
      const { rerender } = render(
        <Toggle checked={false} onChange={vi.fn()} />
      );

      rerender(<Toggle checked onChange={vi.fn()} />);

      expect(screen.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
  });

  describe('ラベル', () => {
    it('label を渡すと本文として表示する', () => {
      render(<Toggle checked={false} onChange={vi.fn()} label="通知" />);

      expect(screen.getByText('通知')).toBeInTheDocument();
    });

    it('label が未指定ならラベルの要素を出さない', () => {
      const { container } = render(
        <Toggle checked={false} onChange={vi.fn()} />
      );

      expect(container.querySelector('span.text-sm')).toBeNull();
    });

    it('label が空文字ならラベルの要素を出さない', () => {
      const { container } = render(
        <Toggle checked={false} onChange={vi.fn()} label="" />
      );

      expect(container.querySelector('span.text-sm')).toBeNull();
    });
  });

  describe('操作', () => {
    it('OFF のときに押すと true が渡る', () => {
      const onChange = vi.fn();
      render(<Toggle checked={false} onChange={onChange} />);

      fireEvent.click(screen.getByRole('switch'));

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('ON のときに押すと false が渡る', () => {
      const onChange = vi.fn();
      render(<Toggle checked onChange={onChange} />);

      fireEvent.click(screen.getByRole('switch'));

      expect(onChange).toHaveBeenCalledWith(false);
    });

    it('押しても自分では状態を持たない（渡された checked のまま）', () => {
      render(<Toggle checked={false} onChange={vi.fn()} />);

      fireEvent.click(screen.getByRole('switch'));

      expect(screen.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });
  });

  describe('無効化', () => {
    it('disabled なら押せず、onChange も呼ばれない', () => {
      const onChange = vi.fn();
      render(<Toggle checked={false} onChange={onChange} disabled />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();

      fireEvent.click(toggle);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('disabled を省略すると押せる', () => {
      render(<Toggle checked={false} onChange={vi.fn()} />);

      expect(screen.getByRole('switch')).toBeEnabled();
    });
  });

  describe('識別子', () => {
    it('data-testid は内部の button に付く', () => {
      render(
        <Toggle checked={false} onChange={vi.fn()} data-testid="pause-toggle" />
      );

      expect(screen.getByTestId('pause-toggle')).toHaveAttribute(
        'role',
        'switch'
      );
    });
  });
});
