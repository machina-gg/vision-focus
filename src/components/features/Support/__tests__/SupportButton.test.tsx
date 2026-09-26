import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { SupportButton } from '../SupportButton';

// Manifest V3 はリモートコードの実行を禁じ、外部ホストの画像もネットワークアクセスになるため、外部資源を読み込まないことを見る
describe('SupportButton', () => {
  it('支援を促す文言のボタンを出す', () => {
    render(<SupportButton onClick={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'supportButtonLabel' })
    ).toBeInTheDocument();
  });

  it('フォームを送信しないボタンとして置かれる', () => {
    render(<SupportButton onClick={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('外部ホストの画像やスクリプトを読み込まない', () => {
    const { container } = render(<SupportButton onClick={vi.fn()} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('押すと onClick が呼ばれる', () => {
    const onClick = vi.fn();
    render(<SupportButton onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('大きさを指定しないときは md として扱う', () => {
    render(<SupportButton onClick={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'md');
  });

  it('小さい表示でも同じ文言とコールバックで動き、大きさが属性に出る', () => {
    const onClick = vi.fn();
    render(<SupportButton onClick={onClick} size="sm" />);

    const button = screen.getByRole('button', { name: 'supportButtonLabel' });
    expect(button).toHaveAttribute('data-size', 'sm');

    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
