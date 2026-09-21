import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SupportPrompt } from '../SupportPrompt';

/**
 * SupportPrompt の表示の出し分けと、押したときに呼ばれるものの検査
 *
 * 出すかどうかの判定は useSupportPrompt が持つ（頻度制御の実体は
 * lib/supportPrompt 側でテスト済み）。ここでは「出さないと判定されたら
 * 場所ごと消える」ことと、支援・閉じるがそれぞれの処理に繋がることを見る。
 *
 * 閉じるボタンはアイコンだけなので aria-label で取る。
 */

const prompt = vi.hoisted(() => ({
  isVisible: false,
  handleSupport: vi.fn(async () => undefined),
  handleDismiss: vi.fn(async () => undefined)
}));

vi.mock('~/hooks/useSupportPrompt', () => ({
  useSupportPrompt: () => ({
    isVisible: prompt.isVisible,
    handleSupport: prompt.handleSupport,
    handleDismiss: prompt.handleDismiss
  })
}));

beforeEach(() => {
  prompt.isVisible = false;
  prompt.handleSupport.mockClear();
  prompt.handleDismiss.mockClear();
});

function renderPrompt(isVisible: boolean) {
  prompt.isVisible = isVisible;
  return render(<SupportPrompt />);
}

describe('SupportPrompt', () => {
  describe('出さないと判定されたとき', () => {
    it('何も描画しない（余白だけが残らない）', () => {
      const { container } = renderPrompt(false);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('出すと判定されたとき', () => {
    it('本文と支援ボタンと閉じるボタンを出す', () => {
      renderPrompt(true);

      expect(screen.getByTestId('support-prompt')).toBeInTheDocument();
      expect(screen.getByText('supportPromptBody')).toBeInTheDocument();
      expect(screen.getByTestId('support-button')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'supportPromptDismiss' })
      ).toBeInTheDocument();
    });

    it('控えめな表示にするため支援ボタンを小さい大きさで置く', () => {
      renderPrompt(true);

      expect(screen.getByTestId('support-button')).toHaveAttribute(
        'data-size',
        'sm'
      );
    });

    it('閉じるボタンはフォームを送信しない', () => {
      renderPrompt(true);

      expect(screen.getByTestId('support-prompt-dismiss')).toHaveAttribute(
        'type',
        'button'
      );
    });
  });

  describe('操作', () => {
    it('支援ボタンを押すと支援の処理だけが走る', () => {
      renderPrompt(true);

      fireEvent.click(screen.getByTestId('support-button'));

      expect(prompt.handleSupport).toHaveBeenCalledTimes(1);
      expect(prompt.handleDismiss).not.toHaveBeenCalled();
    });

    it('閉じるボタンを押すと閉じる処理だけが走る', () => {
      renderPrompt(true);

      fireEvent.click(screen.getByTestId('support-prompt-dismiss'));

      expect(prompt.handleDismiss).toHaveBeenCalledTimes(1);
      expect(prompt.handleSupport).not.toHaveBeenCalled();
    });
  });
});
