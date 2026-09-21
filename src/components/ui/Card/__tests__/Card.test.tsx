import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Card } from '../Card';

/**
 * Card の「押せるかどうか」の出し分けと属性の受け渡しの検査
 *
 * onClick を渡したときだけ role と tabIndex が付き、キーボードと支援技術から
 * 操作対象として見える。variant / padding / className は装飾のクラス名にしか
 * 出ないため検査しない（machina-gg/vision-focus#455）。
 */

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
