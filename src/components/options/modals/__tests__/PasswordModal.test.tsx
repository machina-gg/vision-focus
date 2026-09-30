import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PasswordModal } from '../PasswordModal';

function renderModal(
  overrides: Partial<React.ComponentProps<typeof PasswordModal>> = {}
) {
  const onClose = vi.fn();
  const result = render(
    <PasswordModal
      isOpen
      onClose={onClose}
      onSubmit={onSubmit}
      {...overrides}
    />
  );
  return { onClose, onSubmit, ...result };
}

const field = () => screen.getByLabelText('enterPassword');

const toggleButton = () => screen.getByRole('button', { name: 'showPassword' });

function type(value: string) {
  fireEvent.change(field(), { target: { value } });
}

const onSubmit = vi.fn<(password: string) => Promise<string | null>>();

beforeEach(() => {
  onSubmit.mockReset().mockResolvedValue(null);
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
      renderModal({ description: 'サイトの削除にはパスワードが必要です' });

      expect(
        screen.getByText('サイトの削除にはパスワードが必要です')
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

  describe('送信', () => {
    it('照合はせず、入力値を呼び出し元へ渡す', async () => {
      renderModal();

      type('secret');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });

      expect(onSubmit).toHaveBeenCalledWith('secret');
    });

    it('呼び出し元が成功（null）を返せば閉じる', async () => {
      const { onClose } = renderModal();

      type('secret');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('呼び出し元が失敗の文言を返せばそれを出し、閉じない', async () => {
      onSubmit.mockResolvedValue('passwordIncorrect');
      const { onClose } = renderModal();

      type('wrong');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });

      expect(screen.getByText('passwordIncorrect')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('呼び出し元が例外で終われば照合失敗の文言を出し、閉じない', async () => {
      onSubmit.mockRejectedValue(new Error('disconnected'));
      const { onClose } = renderModal();

      type('secret');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });

      expect(
        screen.getByText('passwordVerificationFailed')
      ).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('Enter キーでも送れる', async () => {
      renderModal();

      type('secret');
      await act(async () => {
        fireEvent.keyDown(field(), { key: 'Enter' });
      });

      expect(onSubmit).toHaveBeenCalledWith('secret');
    });

    it('Enter 以外のキーでは送らない', async () => {
      renderModal();

      type('secret');
      await act(async () => {
        fireEvent.keyDown(field(), { key: 'a' });
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('未入力のまま Enter を押しても送らない', async () => {
      renderModal({ title: '解除の確認' });

      await act(async () => {
        fireEvent.keyDown(field(), { key: 'Enter' });
      });

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.queryByText('passwordRequired')).not.toBeInTheDocument();
    });

    it('送信中に Enter を押しても二重に送らない', async () => {
      let resolveSubmit: (value: string | null) => void = () => undefined;
      onSubmit.mockReturnValue(
        new Promise<string | null>((resolve) => {
          resolveSubmit = resolve;
        })
      );
      renderModal();

      type('secret');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });
      await act(async () => {
        fireEvent.keyDown(field(), { key: 'Enter' });
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSubmit(null);
      });
    });

    it('空白だけでも確認ボタンを押せ、そのまま渡す', async () => {
      renderModal();

      type(' ');
      expect(screen.getByTestId('password-modal-confirm')).toBeEnabled();

      await act(async () => {
        fireEvent.keyDown(field(), { key: 'Enter' });
      });

      expect(onSubmit).toHaveBeenCalledWith(' ');
    });

    it('送信中は確認ボタンが待機表示になり、押せない', async () => {
      let resolveSubmit: (value: string | null) => void = () => undefined;
      onSubmit.mockReturnValue(
        new Promise<string | null>((resolve) => {
          resolveSubmit = resolve;
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
        resolveSubmit(null);
      });
    });
  });

  describe('開き直したときの状態', () => {
    it('前回の入力とエラーが残らない', async () => {
      onSubmit.mockResolvedValue('passwordIncorrect');
      const { rerender } = renderModal();

      type('wrong');
      await act(async () => {
        fireEvent.click(screen.getByTestId('password-modal-confirm'));
      });
      expect(screen.getByText('passwordIncorrect')).toBeInTheDocument();

      rerender(
        <PasswordModal isOpen={false} onClose={vi.fn()} onSubmit={onSubmit} />
      );
      rerender(<PasswordModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

      expect(field()).toHaveValue('');
      expect(screen.queryByText('passwordIncorrect')).not.toBeInTheDocument();
    });
  });

  describe('キャンセル', () => {
    it('キャンセルを押すと onClose だけが呼ばれる', () => {
      const { onClose } = renderModal();

      fireEvent.click(screen.getByTestId('password-modal-cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
