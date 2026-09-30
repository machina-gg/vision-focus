import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ImportConfirmModal } from '../ImportConfirmModal';

const onConfirm = vi.fn<(password?: string) => Promise<string | null>>();

function renderModal(
  overrides: Partial<React.ComponentProps<typeof ImportConfirmModal>> = {}
) {
  const onClose = vi.fn();
  const result = render(
    <ImportConfirmModal
      isOpen
      onClose={onClose}
      requiresPassword={false}
      onConfirm={onConfirm}
      {...overrides}
    />
  );
  return { onClose, ...result };
}

const submitButton = () => screen.getByTestId('import-confirm-submit');
const passwordField = () => screen.queryByTestId('password-field-import');

async function submit() {
  await act(async () => {
    fireEvent.click(submitButton());
  });
}

beforeEach(() => {
  onConfirm.mockReset().mockResolvedValue(null);
});

describe('ImportConfirmModal', () => {
  it('isOpen が false なら何も描画しない', () => {
    const { container } = renderModal({ isOpen: false });

    expect(container).toBeEmptyDOMElement();
  });

  it('すべての設定が上書きされることを伝える', () => {
    renderModal();

    expect(screen.getByTestId('import-confirm-message')).toHaveTextContent(
      'importConfirmMessage'
    );
  });

  describe('パスワード保護なし', () => {
    it('パスワード欄を出さず、パスワード無しで取り込みを依頼して閉じる', async () => {
      const { onClose } = renderModal();

      expect(passwordField()).not.toBeInTheDocument();
      await submit();

      expect(onConfirm).toHaveBeenCalledWith(undefined);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('パスワード保護中', () => {
    it('パスワード欄を出し、入力するまで取り込めない', () => {
      renderModal({ requiresPassword: true });

      expect(passwordField()).toBeInTheDocument();
      expect(submitButton()).toBeDisabled();
    });

    it('入力したパスワードを添えて取り込みを依頼する', async () => {
      const { onClose } = renderModal({ requiresPassword: true });

      fireEvent.change(screen.getByTestId('password-field-import'), {
        target: { value: 'secret' }
      });
      await submit();

      expect(onConfirm).toHaveBeenCalledWith('secret');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Enter でも取り込みを依頼する', async () => {
      renderModal({ requiresPassword: true });
      const field = screen.getByTestId('password-field-import');

      fireEvent.change(field, { target: { value: 'secret' } });
      await act(async () => {
        fireEvent.keyDown(field, { key: 'Enter' });
      });

      expect(onConfirm).toHaveBeenCalledWith('secret');
    });

    it('依頼が理由を返したら理由を出し、閉じない', async () => {
      onConfirm.mockResolvedValue('passwordIncorrect');
      const { onClose } = renderModal({ requiresPassword: true });

      fireEvent.change(screen.getByTestId('password-field-import'), {
        target: { value: 'wrong' }
      });
      await submit();

      expect(screen.getByTestId('import-confirm-error')).toHaveTextContent(
        'passwordIncorrect'
      );
      expect(onClose).not.toHaveBeenCalled();
    });

    it('開き直すと入力と理由を空に戻す', async () => {
      onConfirm.mockResolvedValue('passwordIncorrect');
      const { rerender, onClose } = renderModal({ requiresPassword: true });
      fireEvent.change(screen.getByTestId('password-field-import'), {
        target: { value: 'wrong' }
      });
      await submit();

      const props = { onClose, onConfirm, requiresPassword: true };
      rerender(<ImportConfirmModal isOpen={false} {...props} />);
      rerender(<ImportConfirmModal isOpen {...props} />);

      expect(screen.getByTestId('password-field-import')).toHaveValue('');
      expect(
        screen.queryByTestId('import-confirm-error')
      ).not.toBeInTheDocument();
    });
  });

  it('キャンセルは取り込みを依頼せずに閉じる', () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByTestId('import-confirm-cancel'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
