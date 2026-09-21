import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PasswordSettingsSection } from '../PasswordSettingsSection';
import { STATUS_RESET_DELAY_MS } from '~/constants/intervals';
import type { PasswordSettings } from '~/types/storage';

/**
 * PasswordSettingsSection の表示分岐とコールバックの検査
 *
 * 表示 / 設定 / 変更 / 解除の 4 つの状態があり、どこで何が出るかが
 * そのまま「保護がかかっているか」の判断材料になる。保存に渡る値
 * （enabled と passwordHash の組み合わせ）と、現在のパスワードの照合に
 * 失敗したときに保存へ進まないことを確かめる。
 *
 * ハッシュ化と照合は外部（~/lib/password）に任せているので差し替える。
 *
 * chrome.i18n はテスト環境に無く、getMessage はキー名をそのまま返す
 * （src/lib/i18n.ts）。文言の検査はキー名で行う。
 */

const password = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  validatePasswordStrength: vi.fn()
}));

vi.mock('~/lib/password', () => password);

const DISABLED: PasswordSettings = { enabled: false, passwordHash: null };
const ENABLED: PasswordSettings = {
  enabled: true,
  passwordHash: 'stored-hash'
};

function renderSection(passwordSettings: PasswordSettings = DISABLED) {
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const result = render(
    <PasswordSettingsSection
      passwordSettings={passwordSettings}
      onUpdate={onUpdate}
    />
  );
  return { onUpdate, ...result };
}

// 目印は欄ごとに別の値（password-field-current / -new / -confirm）になったので
// 前方一致でまとめて取る（machina-gg/vision-focus#468）
const fields = () => screen.getAllByTestId(/^password-field-/);
const submit = () => screen.getByTestId('password-form-submit');

/** n 番目のパスワード欄へ入力する */
function fill(index: number, value: string) {
  fireEvent.change(fields()[index], { target: { value } });
}

/** 設定モードへ移る（保護が無効な状態からトグルを入れる） */
function enterSetMode() {
  fireEvent.click(screen.getByTestId('password-enable-toggle'));
}

/** 変更モードへ移る（保護が有効な状態から変更ボタンを押す） */
function enterChangeMode() {
  fireEvent.click(screen.getByTestId('password-change-button'));
}

/** 解除モードへ移る（保護が有効な状態からトグルを切る） */
function enterRemoveMode() {
  fireEvent.click(screen.getByTestId('password-enable-toggle'));
}

async function clickSubmit() {
  await act(async () => {
    fireEvent.click(submit());
  });
}

/** エラー表示の有無（文言そのものは実装側の分岐に委ねる） */
const hasErrorMessage = (container: HTMLElement): boolean =>
  container.querySelector('.text-danger-600') !== null;

beforeEach(() => {
  password.hashPassword.mockReset().mockResolvedValue('new-hash');
  password.verifyPassword.mockReset().mockResolvedValue(true);
  password.validatePasswordStrength
    .mockReset()
    .mockReturnValue({ isValid: true, errorKey: null });
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

    it('enabled でもハッシュが無ければ無効として扱う', () => {
      renderSection({ enabled: true, passwordHash: null });

      expect(
        screen.getByText('passwordProtectionDisabled')
      ).toBeInTheDocument();
      expect(screen.getByTestId('password-enable-toggle')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('ハッシュがあっても enabled でなければ無効として扱う', () => {
      renderSection({ enabled: false, passwordHash: 'stored-hash' });

      expect(
        screen.getByText('passwordProtectionDisabled')
      ).toBeInTheDocument();
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

    it('保存すると有効化とハッシュが渡り、成功を伝える', async () => {
      const { onUpdate } = renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'secret');
      await clickSubmit();

      expect(password.hashPassword).toHaveBeenCalledWith('secret');
      expect(onUpdate).toHaveBeenCalledWith({
        enabled: true,
        passwordHash: 'new-hash'
      });
      expect(screen.getByText('passwordSetSuccess')).toBeInTheDocument();
    });

    it('強度が足りなければ保存しない', async () => {
      password.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errorKey: 'passwordTooShort'
      });
      const { onUpdate, container } = renderSection(DISABLED);

      enterSetMode();
      fill(0, 'ab');
      fill(1, 'ab');
      await clickSubmit();

      // どの文言を出すかは実装側の分岐に委ねる。ここでは保存へ進まないことと
      // 何らかのエラーが出ることだけを見る
      expect(onUpdate).not.toHaveBeenCalled();
      expect(password.hashPassword).not.toHaveBeenCalled();
      expect(hasErrorMessage(container)).toBe(true);
    });

    it('確認が一致しなければ保存しない', async () => {
      const { onUpdate, container } = renderSection(DISABLED);

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'other');
      await clickSubmit();

      expect(onUpdate).not.toHaveBeenCalled();
      expect(password.hashPassword).not.toHaveBeenCalled();
      expect(hasErrorMessage(container)).toBe(true);
    });

    it('保存が失敗したら成功表示を出さない', async () => {
      const onUpdate = vi.fn().mockRejectedValue(new Error('storage error'));
      const { container } = render(
        <PasswordSettingsSection
          passwordSettings={DISABLED}
          onUpdate={onUpdate}
        />
      );

      enterSetMode();
      fill(0, 'secret');
      fill(1, 'secret');
      await clickSubmit();

      expect(screen.queryByText('passwordSetSuccess')).not.toBeInTheDocument();
      expect(hasErrorMessage(container)).toBe(true);
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

    it('現在のパスワードを保存済みハッシュと照合する', async () => {
      renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'current');
      fill(1, 'secret');
      fill(2, 'secret');
      await clickSubmit();

      expect(password.verifyPassword).toHaveBeenCalledWith(
        'current',
        'stored-hash'
      );
    });

    it('照合に失敗したら保存しない', async () => {
      password.verifyPassword.mockResolvedValue(false);
      const { onUpdate } = renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'wrong');
      fill(1, 'secret');
      fill(2, 'secret');
      await clickSubmit();

      expect(screen.getByText('currentPasswordIncorrect')).toBeInTheDocument();
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('照合を通れば新しいハッシュで保存し、成功を伝える', async () => {
      const { onUpdate } = renderSection(ENABLED);

      enterChangeMode();
      fill(0, 'current');
      fill(1, 'secret');
      fill(2, 'secret');
      await clickSubmit();

      expect(onUpdate).toHaveBeenCalledWith({
        enabled: true,
        passwordHash: 'new-hash'
      });
      expect(screen.getByText('passwordChangedSuccess')).toBeInTheDocument();
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

    it('照合に失敗したら解除しない', async () => {
      password.verifyPassword.mockResolvedValue(false);
      const { onUpdate } = renderSection(ENABLED);

      enterRemoveMode();
      fill(0, 'wrong');
      await clickSubmit();

      expect(screen.getByText('currentPasswordIncorrect')).toBeInTheDocument();
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('照合を通れば無効化とハッシュの破棄が渡る', async () => {
      const { onUpdate } = renderSection(ENABLED);

      enterRemoveMode();
      fill(0, 'current');
      await clickSubmit();

      expect(onUpdate).toHaveBeenCalledWith({
        enabled: false,
        passwordHash: null
      });
      expect(screen.getByText('passwordRemovedSuccess')).toBeInTheDocument();
    });

    it('解除の保存が失敗したら成功表示を出さない', async () => {
      const onUpdate = vi.fn().mockRejectedValue(new Error('storage error'));
      render(
        <PasswordSettingsSection
          passwordSettings={ENABLED}
          onUpdate={onUpdate}
        />
      );

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
});
