import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { UnblockHoldSecondsField } from '../UnblockHoldSecondsField';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * 長押しの秒数の選択欄の検査
 *
 * 選んだ秒数がそのまま保存に渡ること、パスワード保護中は選べず理由の
 * 注記が出ることを確かめる。注記が無いと「秒数を変えたのに長押しが出ない」
 * 理由が分からなくなる。
 */

// 選択肢の秒数が描画結果に現れるよう chrome.i18n を差し替える
stubI18nWithSubstitutions();

function renderField(
  overrides: Partial<React.ComponentProps<typeof UnblockHoldSecondsField>> = {}
) {
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const result = render(
    <UnblockHoldSecondsField
      holdSeconds={5}
      onUpdate={onUpdate}
      disabled={false}
      {...overrides}
    />
  );
  return { onUpdate, ...result };
}

const select = () =>
  screen.getByRole('combobox', { name: 'unblockHoldSeconds' });

describe('UnblockHoldSecondsField', () => {
  it('5 / 10 / 30 / 60 秒を選択肢に出す', () => {
    renderField();

    const labels = screen
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(labels).toEqual([
      'unblockHoldSecondsOption(5)',
      'unblockHoldSecondsOption(10)',
      'unblockHoldSecondsOption(30)',
      'unblockHoldSecondsOption(60)'
    ]);
  });

  it('保存済みの秒数を選択中として出す', () => {
    renderField({ holdSeconds: 30 });

    expect(select()).toHaveValue('30');
  });

  it('選んだ秒数を保存に渡す', () => {
    const { onUpdate } = renderField();

    fireEvent.change(select(), { target: { value: '60' } });

    expect(onUpdate).toHaveBeenCalledWith({ holdSeconds: 60 });
  });

  it('選べる状態では注記を出さない', () => {
    renderField();

    expect(select()).toBeEnabled();
    expect(
      screen.queryByTestId('unblock-hold-seconds-password-note')
    ).not.toBeInTheDocument();
  });

  it('無効のときは選べず、パスワード保護中である旨の注記を出す', () => {
    renderField({ disabled: true });

    expect(select()).toBeDisabled();
    expect(
      screen.getByText('unblockHoldSecondsPasswordNote')
    ).toBeInTheDocument();
  });
});
