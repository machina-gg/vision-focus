import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SupportPrompt } from '../SupportPrompt';

const onSupport = vi.fn(async () => undefined);
const onDismiss = vi.fn(async () => undefined);

function renderPrompt() {
  return render(<SupportPrompt onSupport={onSupport} onDismiss={onDismiss} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupportPrompt', () => {
  describe('表示', () => {
    it('本文と支援ボタンと閉じるボタンを出す', () => {
      renderPrompt();

      expect(screen.getByTestId('support-prompt')).toBeInTheDocument();
      expect(screen.getByText('supportPromptBody')).toBeInTheDocument();
      expect(screen.getByTestId('support-button')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'supportPromptDismiss' })
      ).toBeInTheDocument();
    });

    it('控えめな表示にするため支援ボタンを小さい大きさで置く', () => {
      renderPrompt();

      expect(screen.getByTestId('support-button')).toHaveAttribute(
        'data-size',
        'sm'
      );
    });

    it('閉じるボタンはフォームを送信しない', () => {
      renderPrompt();

      expect(screen.getByTestId('support-prompt-dismiss')).toHaveAttribute(
        'type',
        'button'
      );
    });
  });

  describe('操作', () => {
    it('支援ボタンを押すと支援の処理だけが走る', () => {
      renderPrompt();

      fireEvent.click(screen.getByTestId('support-button'));

      expect(onSupport).toHaveBeenCalledTimes(1);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('閉じるボタンを押すと閉じる処理だけが走る', () => {
      renderPrompt();

      fireEvent.click(screen.getByTestId('support-prompt-dismiss'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onSupport).not.toHaveBeenCalled();
    });
  });
});
