import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { FormActions } from '../FormActions';

/**
 * FormActions のボタンの出し分けと、押したときに呼ばれるものの検査
 *
 * 送信ボタンは「処理中」と「押せない」が別々の props で来る。
 * パスワードの設定・変更・削除で共用されるため、処理中の二重送信が
 * 止まっていることと、削除のときだけ見た目の種類が変わることを見る
 * （種類は Button の data-variant に出る。クラス名は見ない）。
 */

function renderActions(
  overrides: Partial<React.ComponentProps<typeof FormActions>> = {}
) {
  const onCancel = vi.fn();
  const onSubmit = vi.fn();
  const result = render(
    <FormActions
      onCancel={onCancel}
      onSubmit={onSubmit}
      submitLabel="setPassword"
      submitDisabled={false}
      isProcessing={false}
      {...overrides}
    />
  );
  return { ...result, onCancel, onSubmit };
}

const submitButton = () => screen.getByTestId('password-form-submit');
const cancelButton = () => screen.getByTestId('password-form-cancel');

describe('FormActions', () => {
  describe('表示', () => {
    it('取り消しと、渡された送信ラベルのボタンを出す', () => {
      renderActions();

      expect(cancelButton()).toHaveTextContent('cancel');
      expect(submitButton()).toHaveTextContent('setPassword');
    });

    it('処理中は送信ラベルの代わりに処理中の文言を出す', () => {
      renderActions({ isProcessing: true });

      expect(submitButton()).toHaveTextContent('processing');
      expect(submitButton()).not.toHaveTextContent('setPassword');
    });

    it('送信ボタンの種類を指定しないときは primary として扱う', () => {
      renderActions();

      expect(submitButton()).toHaveAttribute('data-variant', 'primary');
    });

    it('削除のように種類を指定したときはその種類が属性に出る', () => {
      renderActions({ submitVariant: 'danger' });

      expect(submitButton()).toHaveAttribute('data-variant', 'danger');
    });
  });

  describe('押せるかどうか', () => {
    it('submitDisabled が true のとき送信ボタンは押せない', () => {
      renderActions({ submitDisabled: true });

      expect(submitButton()).toBeDisabled();
    });

    it('押せない送信ボタンをクリックしても onSubmit は呼ばれない', () => {
      const { onSubmit } = renderActions({ submitDisabled: true });

      fireEvent.click(submitButton());

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('処理中でも取り消しは押せる（操作から抜けられなくならない）', () => {
      const { onCancel } = renderActions({
        isProcessing: true,
        submitDisabled: true
      });

      expect(cancelButton()).not.toBeDisabled();
      fireEvent.click(cancelButton());

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('操作', () => {
    it('送信ボタンを押すと onSubmit が呼ばれる', () => {
      const { onSubmit, onCancel } = renderActions();

      fireEvent.click(submitButton());

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('取り消しボタンを押すと onCancel が呼ばれる', () => {
      const { onSubmit, onCancel } = renderActions();

      fireEvent.click(cancelButton());

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
