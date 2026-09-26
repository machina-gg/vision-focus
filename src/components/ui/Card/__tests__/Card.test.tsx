import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Card } from '../Card';

describe('Card', () => {
  describe('子要素', () => {
    it('渡した子要素をそのまま描画する', () => {
      render(
        <Card>
          <p>カードの中身</p>
        </Card>
      );

      expect(screen.getByText('カードの中身')).toBeInTheDocument();
    });
  });

  describe('onClick を渡さないとき', () => {
    it('ボタンとして扱わず、タブ順にも入れない', () => {
      render(<Card data-testid="card">中身</Card>);

      const card = screen.getByTestId('card');
      expect(card).not.toHaveAttribute('role');
      expect(card).not.toHaveAttribute('tabindex');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('onClick を渡したとき', () => {
    it('ボタンの役割を持ち、タブ順に入る', () => {
      render(
        <Card onClick={vi.fn()} data-testid="card">
          中身
        </Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    it('クリックすると onClick が呼ばれる', () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick} data-testid="card">
          中身
        </Card>
      );

      fireEvent.click(screen.getByTestId('card'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('見た目の指定', () => {
    it('既定は default / 余白 md', () => {
      render(<Card data-testid="card">中身</Card>);

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('data-variant', 'default');
      expect(card).toHaveAttribute('data-padding', 'md');
    });

    it.each(['default', 'outlined', 'elevated'] as const)(
      '渡した種類 %s を属性に出す',
      (variant) => {
        render(
          <Card variant={variant} data-testid="card">
            中身
          </Card>
        );

        expect(screen.getByTestId('card')).toHaveAttribute(
          'data-variant',
          variant
        );
      }
    );

    it.each(['none', 'sm', 'md', 'lg'] as const)(
      '渡した余白の大きさ %s を属性に出す',
      (padding) => {
        render(
          <Card padding={padding} data-testid="card">
            中身
          </Card>
        );

        expect(screen.getByTestId('card')).toHaveAttribute(
          'data-padding',
          padding
        );
      }
    );
  });

  describe('その他の属性', () => {
    it('div の属性をそのまま渡す', () => {
      render(
        <Card id="summary-card" aria-label="概要" data-testid="card">
          中身
        </Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('id', 'summary-card');
      expect(card).toHaveAttribute('aria-label', '概要');
    });
  });
});
