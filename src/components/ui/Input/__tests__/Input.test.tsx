import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Input } from '../Input';

describe('Input', () => {
  describe('ラベル', () => {
    it('label を渡すと入力欄と紐づく', () => {
      render(<Input label="ドメイン" />);

      expect(screen.getByLabelText('ドメイン')).toBe(
        screen.getByRole('textbox')
      );
    });

    it('label が未指定ならラベルの要素を出さない', () => {
      const { container } = render(<Input />);

      expect(container.querySelector('label')).toBeNull();
    });

    it('label が空文字ならラベルの要素を出さない', () => {
      const { container } = render(<Input label="" />);

      expect(container.querySelector('label')).toBeNull();
    });

    it('id を渡すとその id がラベルの紐づけに使われる', () => {
      render(<Input label="ドメイン" id="domain-input" />);

      expect(screen.getByLabelText('ドメイン')).toHaveAttribute(
        'id',
        'domain-input'
      );
    });

    it('id が未指定でもラベルと入力欄は紐づく', () => {
      render(<Input label="ドメイン" />);

      // 自動生成された id で紐づく（取得できれば紐づいている）
      expect(screen.getByLabelText('ドメイン')).toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    it('error を渡すと本文として表示する', () => {
      render(<Input error="形式が正しくありません" />);

      expect(screen.getByText('形式が正しくありません')).toBeInTheDocument();
    });

    it('error が未指定ならエラーの要素を出さない', () => {
      const { container } = render(<Input />);

      expect(container.querySelector('p')).toBeNull();
    });

    it('error が空文字ならエラーの要素を出さない', () => {
      const { container } = render(<Input error="" />);

      expect(container.querySelector('p')).toBeNull();
    });
  });

  describe('入力', () => {
    it('onChange にはイベントではなく入力値の文字列が渡る', () => {
      const onChange = vi.fn();
      render(<Input onChange={onChange} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'example.com' }
      });

      expect(onChange).toHaveBeenCalledWith('example.com');
    });

    it('入力を空にすると空文字が渡る', () => {
      const onChange = vi.fn();
      render(<Input onChange={onChange} defaultValue="example.com" />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '' }
      });

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('空白だけの入力もそのまま渡る（呼び出し側で判断する）', () => {
      const onChange = vi.fn();
      render(<Input onChange={onChange} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '   ' }
      });

      expect(onChange).toHaveBeenCalledWith('   ');
    });

    it('onChange が未指定でも入力しても例外にならない', () => {
      render(<Input />);

      expect(() =>
        fireEvent.change(screen.getByRole('textbox'), {
          target: { value: 'example.com' }
        })
      ).not.toThrow();
    });
  });

  describe('input への引き渡し', () => {
    it('placeholder / type / disabled はそのまま input に渡る', () => {
      render(<Input placeholder="example.com" type="password" disabled />);

      const input = screen.getByPlaceholderText('example.com');
      expect(input).toHaveAttribute('type', 'password');
      expect(input).toBeDisabled();
    });

    it('value を渡すとその値が表示される', () => {
      render(<Input value="example.com" onChange={vi.fn()} />);

      expect(screen.getByRole('textbox')).toHaveValue('example.com');
    });
  });
});
