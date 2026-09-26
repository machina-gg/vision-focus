import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PasswordModal } from '../PasswordModal';

const password = vi.hoisted(() => ({
  verifyPassword: vi.fn()
}));

vi.mock('~/lib/password', () => ({
  verifyPassword: password.verifyPassword
}));

function renderModal(
  overrides: Partial<React.ComponentProps<typeof PasswordModal>> = {}
) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const result = render(
    <PasswordModal
      isOpen
      onClose={onClose}
      onSuccess={onSuccess}
      passwordHash="stored-hash"
      {...overrides}
    />
  );
  return { onClose, onSuccess, ...result };
}

const field = () => screen.getByLabelText('enterPassword');

const toggleButton = () => screen.getByRole('button', { name: 'showPassword' });

function type(value: string) {
  fireEvent.change(field(), { target: { value } });
}

beforeEach(() => {
  password.verifyPassword.mockReset().mockResolvedValue(true);
});

describe('PasswordModal', () => {
  describe('開閉', () => {
    it('isOpen が false なら何も描画しない', () => {
      const { container } = renderModal({ isOpen: false });

      expect(container).toBeEmptyDOMElement();
    });

    it('isOpen が true なら入力欄つきのダイアログを出す', () => {
      renderModal();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(field()).toBeInTheDocument();
    });
  });

  describe('見出しと説明', () => {
    it('title が未指定なら既定の見出しを出す', () => {
      renderModal();

      expect(screen.getByRole('heading')).toHaveTextContent('passwordRequired');
    });

    it('title を渡すとその見出しになる', () => {
      renderModal({ title: '解除の確認' });

      expect(screen.getByRole('heading')).toHaveTextContent('解除の確認');
    });

    it('description が未指定なら既定の説明を出す', () => {
      renderModal();

      expect(
        screen.getByText('passwordRequiredDescription')
      ).toBeInTheDocument();
    });

    it('description を渡すとその説明になる', () => {
      renderModal({ description: '一時停止にはパスワードが必要です' });

      expect(
        screen.getByText('一時停止にはパスワードが必要です')
      ).toBeInTheDocument();
    });

    it('title が空文字なら既定の見出しへ落ちる', () => {
      renderModal({ title: '' });

      expect(screen.getByRole('heading')).toHaveTextContent('passwordRequired');
    });
  });

  describe('入力', () => {
    it('入力欄をラベルの文言から特定できる', () => {
      renderModal();

      expect(field()).toBe(screen.getByPlaceholderText('passwordPlaceholder'));
    });

    it('未入力のあいだ確認ボタンは押せない', () => {
      renderModal();

      expect(screen.getByTestId('password-modal-confirm')).toBeDisabled();
    });

    it('入力すると確認ボタンが押せる', () => {
      renderModal();

      type('secret');

      expect(screen.getByTestId('password-modal-confirm')).toBeEnabled();
    });

    it('初期状態では入力値が隠れている', () => {
      renderModal();

      expect(field()).toHaveAttribute('type', 'password');
    });

    it('表示ボタンを押すと入力値が見えるようになる', () => {
      renderModal();

      fireEvent.click(toggleButton());

      expect(field()).toHaveAttribute('type', 'text');
    });

    it('表示中は切り替えボタンの名前が「隠す」に変わる', () => {
      renderModal();

      fireEvent.click(toggleButton());

      expect(
        screen.getByRole('button', { name: 'hidePassword' })
      ).toBeInTheDocument();
    });
  });

  describe('照合', () => {
    it('保存済みハッシュと入力値を渡して照合する', async () => {
      renderModal({ passwordHash: 'stored-hash' });

      type('secret');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });

      expect(password.verifyPassword).toHaveBeenCalledWith(
        'secret',
        'stored-hash'
      );
    });

    it('一致すれば onSuccess と onClose が呼ばれる', async () => {
      const { onSuccess, onClose } = renderModal();

      type('secret');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('一致しなければ誤りを表示し、onSuccess は呼ばれない', async () => {
      password.verifyPassword.mockResolvedValue(false);
      const { onSuccess, onClose } = renderModal();

      type('wrong');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });

      expect(screen.getByText('passwordIncorrect')).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('照合が例外で終わっても onSuccess は呼ばれない', async () => {
      password.verifyPassword.mockRejectedValue(new Error('crypto error'));
      const { onSuccess } = renderModal();

      type('secret');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });

      expect(
        screen.getByText('passwordVerificationFailed')
      ).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('Enter キーでも照合できる', async () => {
      const { onSuccess } = renderModal();

      type('secret');
      await act(async () => {
        fireEvent.keyDown(field(), { key: 'Enter' });
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('Enter 以外のキーでは照合しない', async () => {
      renderModal();

      type('secret');
      await act(async () => {
        fireEvent.keyDown(field(), { key: 'a' });
      });

      expect(password.verifyPassword).not.toHaveBeenCalled();
    });

    it('未入力のまま Enter を押しても照合しない', async () => {
      // 見出しの既定文言と区別するため title を渡して描画する
      renderModal({ title: '解除の確認' });

      await act(async () => {
        fireEvent.keyDown(field(), { key: 'Enter' });
      });

      expect(password.verifyPassword).not.toHaveBeenCalled();
      expect(screen.queryByText('passwordRequired')).not.toBeInTheDocument();
    });

    it('未入力かつ照合中に Enter を押しても照合しない', async () => {
      // 照合中は入力欄を空にできないため、照合を解決させないままその最中の Enter を見る
      let resolveVerify: (value: boolean) => void = () => undefined;
      password.verifyPassword.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveVerify = resolve;
        })
      );
      renderModal();

      type('secret');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });
      expect(password.verifyPassword).toHaveBeenCalledTimes(1);

      await act(async () => {
        fireEvent.keyDown(field(), { key: 'Enter' });
      });

      expect(password.verifyPassword).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveVerify(true);
      });
    });

    it('空白だけでも確認ボタンを押せ、Enter で照合する', async () => {
      // 空白はパスワードとして成立する文字なので、未入力とは区別して通す
      renderModal();

      type(' ');
      expect(screen.getByTestId('password-modal-confirm')).toBeEnabled();

      await act(async () => {
        fireEvent.keyDown(field(), { key: 'Enter' });
      });

      expect(password.verifyPassword).toHaveBeenCalledWith(' ', 'stored-hash');
    });

    it('照合中は確認ボタンが待機表示になり、押せない', async () => {
      let resolveVerify: (value: boolean) => void = () => undefined;
      password.verifyPassword.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveVerify = resolve;
        })
      );
      renderModal();

      type('secret');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });

      const confirm = screen.getByTestId('password-modal-confirm');
      expect(confirm).toHaveTextContent('verifying');
      expect(confirm).toBeDisabled();

      await act(async () => {
        resolveVerify(true);
      });
    });
  });

  describe('開き直したときの状態', () => {
    it('前回の入力とエラーが残らない', async () => {
      password.verifyPassword.mockResolvedValue(false);
      const { rerender } = renderModal();

      type('wrong');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });
      expect(screen.getByText('passwordIncorrect')).toBeInTheDocument();

      rerender(
        <PasswordModal
          isOpen={false}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          passwordHash="stored-hash"
        />
      );
      rerender(
        <PasswordModal
          isOpen
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          passwordHash="stored-hash"
        />
      );

      expect(field()).toHaveValue('');
      expect(screen.queryByText('passwordIncorrect')).not.toBeInTheDocument();
    });
  });

  describe('キャンセル', () => {
    it('キャンセルを押すと onClose だけが呼ばれる', () => {
      const { onClose, onSuccess } = renderModal();

      fireEvent.click(screen.getByTestId('password-modal-cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
