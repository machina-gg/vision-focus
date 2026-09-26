import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { QuickBlockButton } from '../QuickBlockButton';

describe('QuickBlockButton', () => {
  describe('初期表示', () => {
    it('currentDomain が未指定なら入力欄は空で、ボタンは押せない', () => {
      render(<QuickBlockButton onBlock={vi.fn()} />);

      expect(screen.getByTestId('quick-block-input')).toHaveValue('');
      expect(screen.getByTestId('quick-block-button')).toBeDisabled();
    });

    it('currentDomain があれば入力欄に自動で入り、ボタンが押せる', () => {
      render(
        <QuickBlockButton currentDomain="example.com" onBlock={vi.fn()} />
      );

      expect(screen.getByTestId('quick-block-input')).toHaveValue(
        'example.com'
      );
      expect(screen.getByTestId('quick-block-button')).toBeEnabled();
    });

    it('currentDomain が空文字なら入力欄は空のまま', () => {
      render(<QuickBlockButton currentDomain="" onBlock={vi.fn()} />);

      expect(screen.getByTestId('quick-block-input')).toHaveValue('');
      expect(screen.getByTestId('quick-block-button')).toBeDisabled();
    });

    it('currentDomain が後から届くと入力欄に反映される', () => {
      const { rerender } = render(<QuickBlockButton onBlock={vi.fn()} />);

      rerender(
        <QuickBlockButton currentDomain="later.example" onBlock={vi.fn()} />
      );

      expect(screen.getByTestId('quick-block-input')).toHaveValue(
        'later.example'
      );
    });
  });

  describe('ブロックの実行', () => {
    it('ボタンを押すと入力値で onBlock が呼ばれ、入力欄が空になる', () => {
      const onBlock = vi.fn();
      render(
        <QuickBlockButton currentDomain="example.com" onBlock={onBlock} />
      );

      fireEvent.click(screen.getByTestId('quick-block-button'));

      expect(onBlock).toHaveBeenCalledWith('example.com');
      expect(screen.getByTestId('quick-block-input')).toHaveValue('');
    });

    it('前後の空白は取り除いて onBlock に渡す', () => {
      const onBlock = vi.fn();
      render(<QuickBlockButton onBlock={onBlock} />);

      fireEvent.change(screen.getByTestId('quick-block-input'), {
        target: { value: '  example.com  ' }
      });
      fireEvent.click(screen.getByTestId('quick-block-button'));

      expect(onBlock).toHaveBeenCalledWith('example.com');
    });

    it('Enter キーでも onBlock が呼ばれる', () => {
      const onBlock = vi.fn();
      render(<QuickBlockButton onBlock={onBlock} />);

      fireEvent.change(screen.getByTestId('quick-block-input'), {
        target: { value: 'example.com' }
      });
      fireEvent.keyDown(screen.getByTestId('quick-block-input'), {
        key: 'Enter'
      });

      expect(onBlock).toHaveBeenCalledWith('example.com');
    });

    it('Enter 以外のキーでは onBlock は呼ばれない', () => {
      const onBlock = vi.fn();
      render(
        <QuickBlockButton currentDomain="example.com" onBlock={onBlock} />
      );

      fireEvent.keyDown(screen.getByTestId('quick-block-input'), {
        key: 'a'
      });

      expect(onBlock).not.toHaveBeenCalled();
    });

    it('空白のみの入力ではボタンが押せず、onBlock も呼ばれない', () => {
      const onBlock = vi.fn();
      render(<QuickBlockButton onBlock={onBlock} />);

      fireEvent.change(screen.getByTestId('quick-block-input'), {
        target: { value: '   ' }
      });

      expect(screen.getByTestId('quick-block-button')).toBeDisabled();

      fireEvent.keyDown(screen.getByTestId('quick-block-input'), {
        key: 'Enter'
      });

      expect(onBlock).not.toHaveBeenCalled();
    });
  });

  describe('無効化', () => {
    it('disabled なら入力欄もボタンも押せない', () => {
      const onBlock = vi.fn();
      render(
        <QuickBlockButton
          currentDomain="example.com"
          onBlock={onBlock}
          disabled
        />
      );

      expect(screen.getByTestId('quick-block-input')).toBeDisabled();
      expect(screen.getByTestId('quick-block-button')).toBeDisabled();

      fireEvent.click(screen.getByTestId('quick-block-button'));

      expect(onBlock).not.toHaveBeenCalled();
    });
  });
});
