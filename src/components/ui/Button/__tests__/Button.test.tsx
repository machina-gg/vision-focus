import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Button } from '../Button';

/**
 * Button の「押せるかどうか」の出し分けと属性の受け渡しの検査
 *
 * loading は見た目のスピナーだけでなく disabled にも効くため、押せなくなることで
 * 検査できる。variant / size / fullWidth / className は装飾のクラス名にしか
 * 出ないため検査しない（machina-gg/vision-focus#455）。
 */

describe('Button', () => {
  describe('表示', () => {
    it('渡した子要素をボタンの名前として描画する', () => {
      render(<Button>保存する</Button>);

      expect(
        screen.getByRole('button', { name: '保存する' })
      ).toBeInTheDocument();
    });

    it('子要素が空文字でも例外にならない', () => {
      render(<Button data-testid="button">{''}</Button>);

      expect(screen.getByTestId('button')).toBeInTheDocument();
    });
  });

  describe('既定の状態', () => {
    it('押せる状態で、クリックすると onClick が呼ばれる', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>保存する</Button>);

      const button = screen.getByRole('button', { name: '保存する' });
      expect(button).toBeEnabled();

      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading のとき', () => {
    it('押せなくなる', () => {
      render(<Button loading>保存する</Button>);

      expect(screen.getByRole('button', { name: /保存する/ })).toBeDisabled();
    });

    it('クリックしても onClick は呼ばれない', () => {
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          保存する
        </Button>
      );

      fireEvent.click(screen.getByRole('button', { name: /保存する/ }));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('disabled のとき', () => {
    it('押せなくなり、onClick は呼ばれない', () => {
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          保存する
        </Button>
      );

      const button = screen.getByRole('button', { name: '保存する' });
      expect(button).toBeDisabled();

      fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('disabled と loading の両方が偽なら押せる', () => {
      render(
        <Button disabled={false} loading={false}>
          保存する
        </Button>
      );

      expect(screen.getByRole('button', { name: '保存する' })).toBeEnabled();
    });
  });

  describe('その他の属性', () => {
    it('button の属性をそのまま渡す', () => {
      render(
        <Button type="submit" aria-label="送信" data-testid="button">
          保存する
        </Button>
      );

      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAccessibleName('送信');
    });
  });
});
