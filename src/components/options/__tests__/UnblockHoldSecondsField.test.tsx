import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { UnblockHoldSecondsField } from '../UnblockHoldSecondsField';
import { stubI18nWithSubstitutions } from '~/test/i18n';

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

  it('今より長い秒数は確認なしで保存に渡す', () => {
    const { onUpdate } = renderField({ holdSeconds: 10 });

    fireEvent.change(select(), { target: { value: '60' } });

    expect(onUpdate).toHaveBeenCalledWith({ holdSeconds: 60 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('今より短い秒数を選んだとき', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const holdButton = () => screen.getByTestId('unblock-confirm-hold-button');

    it('すぐには保存せず、今の秒数の長押しの確認を出す', () => {
      const { onUpdate } = renderField({ holdSeconds: 30 });

      fireEvent.change(select(), { target: { value: '5' } });

      expect(onUpdate).not.toHaveBeenCalled();
      expect(
        screen.getByText('shortenHoldConfirmDescription(30,5)')
      ).toBeInTheDocument();
    });

    it('今の秒数だけ長押しすると、選んだ秒数を保存に渡す', async () => {
      vi.useFakeTimers();
      const { onUpdate } = renderField({ holdSeconds: 10 });
      fireEvent.change(select(), { target: { value: '5' } });

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(5 * 1000 + 100);
      });
      expect(onUpdate).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(5 * 1000);
      });

      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith({ holdSeconds: 5 });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('確認をやめると保存せず、今の秒数を選んだままにする', () => {
      const { onUpdate } = renderField({ holdSeconds: 30 });
      fireEvent.change(select(), { target: { value: '5' } });

      fireEvent.click(screen.getByTestId('unblock-confirm-cancel'));

      expect(onUpdate).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(select()).toHaveValue('30');
    });
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
