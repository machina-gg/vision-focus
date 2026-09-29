import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PasswordSettingsSection } from '../PasswordSettingsSection';
import { STATUS_RESET_DELAY_MS } from '~/constants/intervals';
import { itemAt } from '~/test/items';
import type { PasswordSettings } from '~/types/storage';

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

import { sendMessage } from '~/lib/messaging';
import type { MessageError } from '~/types/messages';

const DISABLED: PasswordSettings = { enabled: false, passwordHash: null };
const ENABLED: PasswordSettings = {
  enabled: true,
  passwordHash: 'stored-hash'
};

function renderSection(passwordSettings: PasswordSettings = DISABLED) {
  return render(
    <PasswordSettingsSection
      passwordSettings={passwordSettings}
      holdSeconds={5}
      onUnblockConfirmUpdate={vi.fn()}
    />
  );
}

function givenFailure(error?: MessageError) {
  vi.mocked(sendMessage).mockResolvedValue({ success: false, error });
}

const fields = () => screen.getAllByTestId(/^password-field-/);
const submit = () => screen.getByTestId('password-form-submit');

function fill(index: number, value: string) {
  fireEvent.change(itemAt(fields(), index), { target: { value } });
}

function enterSetMode() {
  fireEvent.click(screen.getByTestId('password-enable-toggle'));
}

function enterChangeMode() {
  fireEvent.click(screen.getByTestId('password-change-button'));
}

function enterRemoveMode() {
  fireEvent.click(screen.getByTestId('password-enable-toggle'));
}

async function clickSubmit() {
  await act(async () => {
    fireEvent.click(submit());
  });
}

beforeEach(() => {
  vi.mocked(sendMessage).mockReset().mockResolvedValue({ success: true });
});

describe('PasswordSettingsSection', () => {
  describe('保護の状態表示', () => {
    it('無効なら無効と表示し、変更ボタンを出さない', () => {
      renderSection(DISABLED);

      expect(
        screen.getByText('passwordProtectionDisabled')
      ).toBeInTheDocument();
      expect(screen.getByTestId('password-enable-toggle')).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(
        screen.queryByTestId('password-change-button')
      ).not.toBeInTheDocument();
    });

    it('有効なら有効と表示し、変更ボタンを出す', () => {
      renderSection(ENABLED);

      expect(screen.getByText('passwordProtectionEnabled')).toBeInTheDocument();
      expect(screen.getByTestId('password-enable-toggle')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByTestId('password-change-button')).toBeInTheDocument();
    });

    it('有効でもハッシュが無ければ保護なしとして表示する（background の照合と同じ判定）', () => {
      renderSection({ enabled: true, passwordHash: null });

      expect(
        screen.queryByText('passwordProtectionEnabled')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('password-enable-toggle')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });
  });

  describe('設定モード', () => {
    it('トグルを入れると新規設定の案内と入力欄 2 つを出す', () => {
      renderSection(DISABLED);

      enterSetMode();

      expect(screen.getByText('passwordSetInstructions')).toBeInTheDocument();
      expect(fields()).toHaveLength(2);
      expect(
        screen.queryByTestId('password-enable-toggle')
      ).not.toBeInTheDocument();
    });

    it('新パスワードと確認の両方が埋まるまで保存できない', () => {
      renderSection(DISABLED);

      enterSetMode();
      expect(submit()).toBeDisabled();

      fill(0, 'secret');
      expect(submit()).toBeDisabled();

      fill(1, 'secret');
      expect(submit()).toBeEnabled();
    });

    it('平文のパスワードを set-password で送り、成功を伝える', async () => {
      renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'secret');
      await clickSubmit();

      expect(sendMessage).toHaveBeenCalledWith('set-password', {
        password: 'secret'
      });
      expect(screen.getByText('passwordSetSuccess')).toBeInTheDocument();
    });

    it('短すぎれば、その理由を出して送らない', async () => {
      renderSection(DISABLED);

      enterSetMode();
      fill(0, 'ab');
      fill(1, 'ab');
      await clickSubmit();

      expect(sendMessage).not.toHaveBeenCalled();
      expect(screen.getByText('passwordTooShort')).toBeInTheDocument();
      expect(screen.queryByText('passwordSetFailed')).not.toBeInTheDocument();
    });

    it('確認が一致しなければ、一致しないことを出して送らない', async () => {
      renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'other');
      await clickSubmit();

      expect(sendMessage).not.toHaveBeenCalled();
      expect(screen.getByText('passwordMismatch')).toBeInTheDocument();
      expect(screen.queryByText('passwordSetFailed')).not.toBeInTheDocument();
    });

    it('background が長さで拒んだらその理由を出す', async () => {
      givenFailure({ code: 'password-invalid', reason: 'too-long' });
      renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'secret');
      await clickSubmit();

      expect(screen.getByText('passwordTooLong')).toBeInTheDocument();
      expect(screen.queryByText('passwordSetSuccess')).not.toBeInTheDocument();
    });

    it.each([
      ['理由の無い失敗', undefined],
      ['保存の失敗', { code: 'save-failed' } as const],
      ['設定済み', { code: 'password-already-set' } as const]
    ])('%s なら設定の失敗の文言を出す', async (_label, error) => {
      givenFailure(error);
      renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'secret');
      await clickSubmit();

      expect(screen.queryByText('passwordSetSuccess')).not.toBeInTheDocument();
      expect(screen.getByText('passwordSetFailed')).toBeInTheDocument();
    });

    it('送信が例外で終わっても設定の失敗の文言を出す', async () => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
      renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'secret');
      await clickSubmit();

      expect(screen.getByText('passwordSetFailed')).toBeInTheDocument();
    });

    it('続けて失敗しても毎回その理由を出す', async () => {
      renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'other');
      await clickSubmit();
      expect(screen.getByText('passwordMismatch')).toBeInTheDocument();

      fill(0, 'ab');
      fill(1, 'ab');
      await clickSubmit();

      expect(screen.getByText('passwordTooShort')).toBeInTheDocument();
      expect(screen.queryByText('passwordSetFailed')).not.toBeInTheDocument();
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('キャンセルすると表示モードへ戻る', () => {
      renderSection(DISABLED);

      enterSetMode();
      fireEvent.click(screen.getByTestId('password-form-cancel'));

      expect(
        screen.getByText('passwordProtectionDisabled')
      ).toBeInTheDocument();
      expect(screen.queryAllByTestId(/^password-field-/)).toHaveLength(0);
    });

    it('キャンセル後に入力し直すと前の入力は残っていない', () => {
      renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fireEvent.click(screen.getByTestId('password-form-cancel'));
      enterSetMode();

      expect(fields()[0]).toHaveValue('');
    });
  });

  describe('変更モード', () => {
    it('変更ボタンを押すと入力欄 3 つを出す', () => {
      renderSection(ENABLED);

      enterChangeMode();

      expect(fields()).toHaveLength(3);
    });

    it('3 つすべてが埋まるまで保存できない', () => {
      renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'current');
      fill(1, 'secret');
      expect(submit()).toBeDisabled();

      fill(2, 'secret');
      expect(submit()).toBeEnabled();
    });

    it('今のパスワードと新しいパスワードを change-password で送り、成功を伝える', async () => {
      renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'current');
      fill(1, 'secret');
      fill(2, 'secret');
      await clickSubmit();

      expect(sendMessage).toHaveBeenCalledWith('change-password', {
        currentPassword: 'current',
        newPassword: 'secret'
      });
      expect(screen.getByText('passwordChangedSuccess')).toBeInTheDocument();
    });

    it('今のパスワードが違えば、今のパスワードの誤りを出す', async () => {
      givenFailure({ code: 'password-mismatch' });
      renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'wrong');
      fill(1, 'secret');
      fill(2, 'secret');
      await clickSubmit();

      expect(screen.getByText('currentPasswordIncorrect')).toBeInTheDocument();
      expect(
        screen.queryByText('passwordChangedSuccess')
      ).not.toBeInTheDocument();
    });

    it('未設定なら、未設定であることを出す', async () => {
      givenFailure({ code: 'password-not-set' });
      renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'current');
      fill(1, 'secret');
      fill(2, 'secret');
      await clickSubmit();

      expect(screen.getByText('passwordNotSet')).toBeInTheDocument();
    });

    it('短すぎれば、その理由を出して送らない', async () => {
      renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'current');
      fill(1, 'ab');
      fill(2, 'ab');
      await clickSubmit();

      expect(sendMessage).not.toHaveBeenCalled();
      expect(screen.getByText('passwordTooShort')).toBeInTheDocument();
      expect(
        screen.queryByText('passwordChangeFailed')
      ).not.toBeInTheDocument();
    });

    it('確認が一致しなければ、一致しないことを出して送らない', async () => {
      renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'current');
      fill(1, 'secret');
      fill(2, 'other');
      await clickSubmit();

      expect(sendMessage).not.toHaveBeenCalled();
      expect(screen.getByText('passwordMismatch')).toBeInTheDocument();
    });

    it('理由の分からない失敗なら変更の失敗の文言を出す', async () => {
      givenFailure({ code: 'save-failed' });
      renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'current');
      fill(1, 'secret');
      fill(2, 'secret');
      await clickSubmit();

      expect(screen.getByText('passwordChangeFailed')).toBeInTheDocument();
    });
  });

  describe('解除モード', () => {
    it('トグルを切ると解除の警告と入力欄 1 つを出す', () => {
      renderSection(ENABLED);

      enterRemoveMode();

      expect(screen.getByText('passwordRemoveWarning')).toBeInTheDocument();
      expect(fields()).toHaveLength(1);
    });

    it('現在のパスワードが空のあいだは解除できない', () => {
      renderSection(ENABLED);

      enterRemoveMode();
      expect(submit()).toBeDisabled();

      fill(0, 'current');
      expect(submit()).toBeEnabled();
    });

    it('今のパスワードが違えば、今のパスワードの誤りを出す', async () => {
      givenFailure({ code: 'password-mismatch' });
      renderSection(ENABLED);

      enterRemoveMode();
      fill(0, 'wrong');
      await clickSubmit();

      expect(screen.getByText('currentPasswordIncorrect')).toBeInTheDocument();
      expect(
        screen.queryByText('passwordRemovedSuccess')
      ).not.toBeInTheDocument();
    });

    it('今のパスワードを remove-password で送り、成功を伝える', async () => {
      renderSection(ENABLED);

      enterRemoveMode();
      fill(0, 'current');
      await clickSubmit();

      expect(sendMessage).toHaveBeenCalledWith('remove-password', {
        currentPassword: 'current'
      });
      expect(screen.getByText('passwordRemovedSuccess')).toBeInTheDocument();
    });

    it('理由の分からない失敗なら解除の失敗の文言を出す', async () => {
      vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
      renderSection(ENABLED);

      enterRemoveMode();
      fill(0, 'current');
      await clickSubmit();

      expect(screen.getByText('passwordRemoveFailed')).toBeInTheDocument();
      expect(
        screen.queryByText('passwordRemovedSuccess')
      ).not.toBeInTheDocument();
    });
  });

  describe('成功後の自動リセット', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('一定時間たつと表示モードへ戻る', async () => {
      renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'secret');
      await clickSubmit();
      expect(screen.getByText('passwordSetSuccess')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(STATUS_RESET_DELAY_MS);
      });

      expect(screen.queryAllByTestId(/^password-field-/)).toHaveLength(0);
      expect(screen.getByTestId('password-enable-toggle')).toBeInTheDocument();
    });
  });
  describe('長押しの秒数との並び', () => {
    it('パスワード保護が無効なら秒数を選べる', () => {
      renderSection(DISABLED);

      expect(
        screen.getByRole('combobox', { name: 'unblockHoldSeconds' })
      ).toBeEnabled();
      expect(
        screen.queryByText('unblockHoldSecondsPasswordNote')
      ).not.toBeInTheDocument();
    });

    it('パスワード保護が有効なら秒数を選べず、注記を出す', () => {
      renderSection(ENABLED);

      expect(
        screen.getByRole('combobox', { name: 'unblockHoldSeconds' })
      ).toBeDisabled();
      expect(
        screen.getByText('unblockHoldSecondsPasswordNote')
      ).toBeInTheDocument();
    });

    it('選んだ秒数を秒数の保存へ渡し、パスワードのメッセージは送らない', () => {
      const onUnblockConfirmUpdate = vi.fn().mockResolvedValue(undefined);
      render(
        <PasswordSettingsSection
          passwordSettings={DISABLED}
          holdSeconds={5}
          onUnblockConfirmUpdate={onUnblockConfirmUpdate}
        />
      );

      fireEvent.change(
        screen.getByRole('combobox', { name: 'unblockHoldSeconds' }),
        { target: { value: '10' } }
      );

      expect(onUnblockConfirmUpdate).toHaveBeenCalledWith({ holdSeconds: 10 });
      expect(sendMessage).not.toHaveBeenCalled();
    });
  });
});
