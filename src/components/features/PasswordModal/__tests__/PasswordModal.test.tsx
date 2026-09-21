import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PasswordModal } from '../PasswordModal';

/**
 * PasswordModal の入力・表示切替・送信の検査
 *
 * ここはブロックの一時停止を守る関門なので、「送信できてはいけない状態」を
 * 重点的に見る（未入力・照合中）。Enter キーも送信経路なので、ボタンと
 * 同じ条件で止まることまで確かめる。
 */

type ModalProps = Parameters<typeof PasswordModal>[0];

function renderModal(props: Partial<ModalProps> = {}) {
  const handlers = {
    onPasswordInputChange: vi.fn(),
    onToggleShowPassword: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn()
  };

  const view = render(
    <PasswordModal
      passwordInput=""
      passwordError={null}
      showPassword={false}
      isVerifying={false}
      {...handlers}
      {...props}
    />
  );

  return {
    ...view,
    ...handlers,
    ...props,
    input: screen.getByPlaceholderText('passwordPlaceholder')
  };
}

/** 送信ボタン（照合中は文言が変わる） */
const submitButton = (name: 'confirm' | 'verifying' = 'confirm') =>
  screen.getByRole('button', { name });

describe('PasswordModal', () => {
  describe('入力', () => {
    it('渡した値を入力欄に出す', () => {
      const { input } = renderModal({ passwordInput: 'secret' });

      expect(input).toHaveValue('secret');
    });

    it('入力すると入力された値で onPasswordInputChange が呼ばれる', () => {
      const { input, onPasswordInputChange } = renderModal();

      fireEvent.change(input, { target: { value: 'abc' } });

      expect(onPasswordInputChange).toHaveBeenCalledWith('abc');
    });
  });

  describe('エラー', () => {
    it('エラーが無いときは何も出さない', () => {
      renderModal({ passwordError: null });

      expect(
        screen.queryByText('パスワードが違います')
      ).not.toBeInTheDocument();
    });

    it('エラーがあるときはその文言を出す', () => {
      renderModal({ passwordError: 'パスワードが違います' });

      expect(screen.getByText('パスワードが違います')).toBeInTheDocument();
    });
  });

  describe('パスワードの表示切替', () => {
    it('既定では伏せ字で表示する', () => {
      const { input } = renderModal({ showPassword: false });

      expect(input).toHaveAttribute('type', 'password');
    });

    it('showPassword が true のときは平文で表示する', () => {
      const { input } = renderModal({ showPassword: true });

      expect(input).toHaveAttribute('type', 'text');
    });

    it('切替ボタンを押すと onToggleShowPassword が呼ばれる', () => {
      const { input, onToggleShowPassword } = renderModal();

      // 切替ボタンは文言を持たないため、入力欄と同じ入れ物の中から取る
      const toggle = input.parentElement?.querySelector('button');
      expect(toggle).not.toBeNull();
      fireEvent.click(toggle as HTMLButtonElement);

      expect(onToggleShowPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('未入力のとき', () => {
    it('送信ボタンを押せない', () => {
      renderModal({ passwordInput: '' });

      expect(submitButton()).toBeDisabled();
    });

    it('Enter キーを押しても例外にならない', () => {
      // ボタンは未入力で止まるが Enter は止まらない。どちらが正かは
      // 判断待ちのため（PR 本文の PM への確認事項）、ここでは
      // 落ちないことだけを見て、現在の呼び出し有無を仕様として固定しない
      const { input } = renderModal({ passwordInput: '' });

      expect(() => fireEvent.keyDown(input, { key: 'Enter' })).not.toThrow();
    });
  });

  describe('入力済みのとき', () => {
    it('送信ボタンを押すと onSubmit が呼ばれる', () => {
      const { onSubmit } = renderModal({ passwordInput: 'secret' });

      fireEvent.click(submitButton());

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('Enter キーでも onSubmit が呼ばれる', () => {
      const { input, onSubmit } = renderModal({ passwordInput: 'secret' });

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('Enter 以外のキーでは呼ばれない', () => {
      const { input, onSubmit } = renderModal({ passwordInput: 'secret' });

      fireEvent.keyDown(input, { key: 'a' });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('照合中のとき', () => {
    it('送信ボタンの文言が変わり、押せない', () => {
      renderModal({ passwordInput: 'secret', isVerifying: true });

      expect(submitButton('verifying')).toBeDisabled();
      expect(
        screen.queryByRole('button', { name: 'confirm' })
      ).not.toBeInTheDocument();
    });

    it('Enter キーを押しても二重に送信しない', () => {
      const { input, onSubmit } = renderModal({
        passwordInput: 'secret',
        isVerifying: true
      });

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('閉じる操作', () => {
    it('キャンセルを押すと onClose が呼ばれる', () => {
      const { onClose } = renderModal();

      fireEvent.click(screen.getByRole('button', { name: 'cancel' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('見出しの閉じるボタンを押すと onClose が呼ばれる', () => {
      const { onClose } = renderModal();

      // 閉じるボタンは文言を持たないため、見出しと同じ行から取る
      const header = screen.getByText('passwordRequired').parentElement;
      fireEvent.click(header?.querySelector('button') as HTMLButtonElement);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('背景を押すと onClose が呼ばれる', () => {
      const { container, onClose } = renderModal();

      // 背景は role を持たないため、最上位の最初の子として取る
      const backdrop = container.firstElementChild?.firstElementChild;
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop as Element);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
