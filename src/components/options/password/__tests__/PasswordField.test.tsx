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
 *
 * ラベルと入力欄の結び付きも見る。伏せ字で中身が見えないため、
 * 結び付いていないとどの欄を触っているか読み上げでも画面でも分からない
 * （machina-gg/vision-focus#468）。
 */

function renderField(
  overrides: Partial<React.ComponentProps<typeof PasswordField>> = {}
) {
  const onChange = vi.fn();
  const onToggleShow = vi.fn();
  const result = render(
    <PasswordField
      fieldId="password-field-new"
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

/** 入力欄はラベルの文言から引く（結び付きが切れたらここで落ちる） */
const field = () => screen.getByLabelText('新しいパスワード');

/** パスワード変更フォームと同じ 3 欄のラベル（現在 / 新規 / 確認） */
const CHANGE_FORM_LABELS = {
  current: '現在のパスワード',
  new: '新しいパスワード',
  confirm: '確認用パスワード'
};

/** 変更フォームと同じく 3 欄を同時に描画する */
function renderChangeFormFields() {
  return render(
    <>
      <PasswordField
        fieldId="password-field-current"
        label={CHANGE_FORM_LABELS.current}
        value="current-value"
        onChange={vi.fn()}
        show={false}
        onToggleShow={vi.fn()}
        placeholder="現在のパスワード"
      />
      <PasswordField
        fieldId="password-field-new"
        label={CHANGE_FORM_LABELS.new}
        value="new-value"
        onChange={vi.fn()}
        show={false}
        onToggleShow={vi.fn()}
        placeholder="新しいパスワード"
      />
      <PasswordField
        fieldId="password-field-confirm"
        label={CHANGE_FORM_LABELS.confirm}
        value="confirm-value"
        onChange={vi.fn()}
        show={false}
        onToggleShow={vi.fn()}
        placeholder="確認用パスワード"
      />
    </>
  );
}

describe('PasswordField', () => {
  describe('ラベルとの結び付き', () => {
    it('ラベルの文言から入力欄を引ける', () => {
      renderField({ label: '現在のパスワード' });

      expect(screen.getByLabelText('現在のパスワード')).toHaveAttribute(
        'type',
        'password'
      );
    });

    it('渡した識別子が入力欄の id になる', () => {
      renderField({ fieldId: 'password-field-current' });

      expect(field()).toHaveAttribute('id', 'password-field-current');
    });

    it('再描画しても識別子は変わらない', () => {
      const { rerender } = renderField({ value: '' });
      const before = field().id;

      rerender(
        <PasswordField
          fieldId="password-field-new"
          label="新しいパスワード"
          value="secret"
          onChange={vi.fn()}
          show={false}
          onToggleShow={vi.fn()}
          placeholder="パスワードを入力"
        />
      );

      expect(field().id).toBe(before);
    });

    it('テスト用の目印は渡した識別子になる', () => {
      renderField({ fieldId: 'password-field-confirm' });

      expect(screen.getByTestId('password-field-confirm')).toBe(field());
    });

    it('3 つ並べても、それぞれ自分のラベルの文言から特定できる', () => {
      renderChangeFormFields();

      expect(screen.getByLabelText(CHANGE_FORM_LABELS.current)).toHaveValue(
        'current-value'
      );
      expect(screen.getByLabelText(CHANGE_FORM_LABELS.new)).toHaveValue(
        'new-value'
      );
      expect(screen.getByLabelText(CHANGE_FORM_LABELS.confirm)).toHaveValue(
        'confirm-value'
      );
    });

    it('3 つ並べたとき、テスト用の目印は欄ごとに別の値になる', () => {
      renderChangeFormFields();

      const testIds = Object.values(CHANGE_FORM_LABELS).map((label) =>
        screen.getByLabelText(label).getAttribute('data-testid')
      );

      expect(testIds.every((testId) => testId !== null)).toBe(true);
      expect(new Set(testIds).size).toBe(testIds.length);
    });
  });

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

  describe('呼び出し側に委ねる操作', () => {
    it('キー操作を渡すと、押されたキーがそのまま届く', () => {
      // ダイアログでの Enter 送信はこの経路に乗る
      // （machina-gg/vision-focus#476）
      const onKeyDown = vi.fn();
      renderField({ onKeyDown });

      fireEvent.keyDown(field(), { key: 'Enter' });

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onKeyDown.mock.calls[0][0]).toMatchObject({ key: 'Enter' });
    });

    it('キー操作を渡さなくても例外にならない', () => {
      renderField();

      expect(() => fireEvent.keyDown(field(), { key: 'Enter' })).not.toThrow();
    });

    it('autoFocus を渡すとその欄に入力できる状態で開く', () => {
      renderField({ autoFocus: true });

      expect(field()).toHaveFocus();
    });

    it('autoFocus を渡さなければ勝手に焦点を奪わない', () => {
      renderField();

      expect(field()).not.toHaveFocus();
    });
  });
});
