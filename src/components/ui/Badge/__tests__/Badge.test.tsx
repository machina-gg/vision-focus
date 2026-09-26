import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Badge } from '../Badge';

const badge = () => screen.getByTestId('badge-host').firstElementChild;

function renderBadge(props: Partial<React.ComponentProps<typeof Badge>> = {}) {
  const { children = 'ラベル', ...rest } = props;
  return render(
    <div data-testid="badge-host">
      <Badge {...rest}>{children}</Badge>
    </div>
  );
}

describe('Badge', () => {
  describe('中身', () => {
    it('渡した文字列をそのまま出す', () => {
      renderBadge({ children: '3 件' });

      expect(screen.getByText('3 件')).toBeInTheDocument();
    });

    it('要素を渡してもそのまま描画する', () => {
      renderBadge({ children: <span data-testid="badge-child" /> });

      expect(screen.getByTestId('badge-child')).toBeInTheDocument();
    });

    it('空文字でも例外にならず、中身の無い印として残る', () => {
      renderBadge({ children: '' });

      expect(badge()).toBeInTheDocument();
      expect(badge()).toHaveTextContent('');
    });
  });

  describe('見た目の種類', () => {
    it('指定しないときは default として扱う', () => {
      renderBadge();

      expect(badge()).toHaveAttribute('data-variant', 'default');
    });

    it.each([
      'default',
      'success',
      'warning',
      'danger',
      'info',
      'premium'
    ] as const)('%s を指定するとその種類が属性に出る', (variant) => {
      renderBadge({ variant });

      expect(badge()).toHaveAttribute('data-variant', variant);
    });
  });
});
