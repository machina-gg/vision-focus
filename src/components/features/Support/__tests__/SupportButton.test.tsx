import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { SupportButton } from '../SupportButton';

/**
 * SupportButton の役割と、押したときに呼ばれるものの検査
 *
 * Manifest V3 はリモートコードの実行を禁じており、外部ホストの画像も
 * ネットワークアクセスになる。ボタンが外部資源を読み込まないことを
 * 検査に含める（公式ウィジェットへ戻す変更が黙って通らないようにする）。
 *
 * size は余白とアイコン寸法のクラス名にしか出ないため検査しない。
 */

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

  it('小さい表示でも同じ文言とコールバックで動く', () => {
    const onClick = vi.fn();
    render(<SupportButton onClick={onClick} size="sm" />);

    fireEvent.click(screen.getByRole('button', { name: 'supportButtonLabel' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
