import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PasswordField } from '../PasswordField';

/**
 * PasswordField の伏せ字の切り替えと、入力で渡る値の検査
 *
 * 表示中かどうかは目のアイコンの差でしか出ていなかったため、
 * 切り替えボタンに aria-label を足してから検査する
 * （COMPONENT_TESTING.md「状態は属性で表す」）。伏せ字そのものは
 * input の type に出るので、そちらも合わせて見る。
 */

function renderField(
  overrides: Partial<React.ComponentProps<typeof PasswordField>> = {}
) {
  const onChange = vi.fn();
  const onToggleShow = vi.fn();
  const result = render(
    <PasswordField
      label="新しいパスワード"
      value=""
      onChange={onChange}
      show={false}
      onToggleShow={onToggleShow}
      placeholder="パスワードを入力"
      {...overrides}
    />
  );
  return { ...result, onChange, onToggleShow };
}

/** 入力欄は label と結び付いていないため testid で取る（PM への確認事項に記載） */
const field = () => screen.getByTestId('password-field');

describe('PasswordField', () => {
  describe('表示', () => {
    it('渡したラベルとプレースホルダーを出す', () => {
      renderField();

      expect(screen.getByText('新しいパスワード')).toBeInTheDocument();
      expect(field()).toHaveAttribute('placeholder', 'パスワードを入力');
    });

    it('渡した値を入力欄に出す', () => {
      renderField({ value: 'secret' });

      expect(field()).toHaveValue('secret');
    });

    it('値が空でも例外にならず、空の入力欄になる', () => {
      renderField({ value: '' });

      expect(field()).toHaveValue('');
    });
  });

  describe('伏せ字の切り替え', () => {
    it('show が false のときは伏せ字で、ボタンは「表示する」名前になる', () => {
      renderField({ show: false });

      expect(field()).toHaveAttribute('type', 'password');
      expect(
        screen.getByRole('button', { name: 'showPassword' })
      ).toBeInTheDocument();
    });

    it('show が true のときは平文で、ボタンは「隠す」名前になる', () => {
      renderField({ show: true });

      expect(field()).toHaveAttribute('type', 'text');
      expect(
        screen.getByRole('button', { name: 'hidePassword' })
      ).toBeInTheDocument();
    });

    it('切り替えボタンはフォームを送信しない', () => {
      renderField();

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('切り替えボタンを押すと onToggleShow が呼ばれる', () => {
      const { onToggleShow } = renderField();

      fireEvent.click(screen.getByRole('button', { name: 'showPassword' }));

      expect(onToggleShow).toHaveBeenCalledTimes(1);
    });
  });

  describe('入力', () => {
    it('入力した値で onChange が呼ばれる', () => {
      const { onChange } = renderField();

      fireEvent.change(field(), { target: { value: 'new-secret' } });

      expect(onChange).toHaveBeenCalledWith('new-secret');
    });

    it('すべて消したときは空文字で onChange が呼ばれる', () => {
      const { onChange } = renderField({ value: 'secret' });

      fireEvent.change(field(), { target: { value: '' } });

      expect(onChange).toHaveBeenCalledWith('');
    });
  });
});
