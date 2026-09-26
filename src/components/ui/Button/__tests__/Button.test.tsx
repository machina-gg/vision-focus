import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Button } from '../Button';

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

  describe('見た目の指定', () => {
    it('既定は primary / md / 幅いっぱいでない / 読み込み中でない', () => {
      render(<Button data-testid="button">保存する</Button>);

      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('data-variant', 'primary');
      expect(button).toHaveAttribute('data-size', 'md');
      expect(button).toHaveAttribute('data-full-width', 'false');
      expect(button).toHaveAttribute('data-loading', 'false');
    });

    it.each(['primary', 'secondary', 'danger', 'ghost'] as const)(
      '渡した種類 %s を属性に出す',
      (variant) => {
        render(
          <Button variant={variant} data-testid="button">
            保存する
          </Button>
        );

        expect(screen.getByTestId('button')).toHaveAttribute(
          'data-variant',
          variant
        );
      }
    );

    it.each(['sm', 'md', 'lg'] as const)(
      '渡した大きさ %s を属性に出す',
      (size) => {
        render(
          <Button size={size} data-testid="button">
            保存する
          </Button>
        );

        expect(screen.getByTestId('button')).toHaveAttribute('data-size', size);
      }
    );

    it('幅いっぱいの指定を属性に出す', () => {
      render(
        <Button fullWidth data-testid="button">
          保存する
        </Button>
      );

      expect(screen.getByTestId('button')).toHaveAttribute(
        'data-full-width',
        'true'
      );
    });

    it('読み込み中の指定を属性に出す', () => {
      render(
        <Button loading data-testid="button">
          保存する
        </Button>
      );

      expect(screen.getByTestId('button')).toHaveAttribute(
        'data-loading',
        'true'
      );
    });

    it('disabled で押せなくなっても読み込み中とは区別できる', () => {
      render(
        <Button disabled data-testid="button">
          保存する
        </Button>
      );

      const button = screen.getByTestId('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-loading', 'false');
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
