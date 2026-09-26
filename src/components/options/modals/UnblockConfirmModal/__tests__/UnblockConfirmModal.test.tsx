import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { UnblockConfirmModal } from '../UnblockConfirmModal';
import { stubI18nWithSubstitutions } from '~/test/i18n';

stubI18nWithSubstitutions();

// 既定の秒数。既存の検査はこの長さを前提にする
const HOLD_SECONDS = 5;
const HOLD_DURATION_MS = HOLD_SECONDS * 1000;

function renderModal(
  overrides: Partial<React.ComponentProps<typeof UnblockConfirmModal>> = {}
) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const result = render(
    <UnblockConfirmModal
      isOpen
      onClose={onClose}
      onConfirm={onConfirm}
      domain="example.com"
      blockStyle="集中モード"
      action="toggle"
      holdSeconds={HOLD_SECONDS}
      {...overrides}
    />
  );
  return { onClose, onConfirm, ...result };
}

const holdButton = () => screen.getByTestId('unblock-confirm-hold-button');

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('UnblockConfirmModal', () => {
  describe('開閉', () => {
    it('isOpen が false なら何も描画しない', () => {
      const { container } = renderModal({ isOpen: false });

      expect(container).toBeEmptyDOMElement();
    });

    it('isOpen が true なら確認のダイアログを出す', () => {
      renderModal();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('unblockConfirmTitle')).toBeInTheDocument();
    });
  });

  describe('説明文', () => {
    it('解除のときは解除の説明をドメイン名つきで出し、削除の説明は出さない', () => {
      renderModal({ action: 'toggle' });

      expect(
        screen.getByText('unblockConfirmDescription(example.com,5)')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('deleteBlockConfirmDescription(example.com,5)')
      ).not.toBeInTheDocument();
    });

    it('削除のときは削除の説明をドメイン名つきで出し、解除の説明は出さない', () => {
      renderModal({ action: 'delete' });

      expect(
        screen.getByText('deleteBlockConfirmDescription(example.com,5)')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('unblockConfirmDescription(example.com,5)')
      ).not.toBeInTheDocument();
    });

    it('適用中のスタイル名を併記する', () => {
      renderModal({ blockStyle: '集中モード' });

      expect(
        screen.getByText('unblockConfirmBlockStyle(集中モード)')
      ).toBeInTheDocument();
    });

    it('スタイル名が空文字でも欄そのものは出す', () => {
      renderModal({ blockStyle: '' });

      expect(
        screen.getByText('unblockConfirmBlockStyle()')
      ).toBeInTheDocument();
    });
  });

  describe('長押しの進捗', () => {
    it('押す前は 0% で、残り秒数を出さない', () => {
      renderModal();

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(holdButton()).toHaveTextContent('unblockConfirmHoldButton');
      expect(holdButton().textContent).not.toMatch(/\ds\)/);
    });

    it('押している途中は進捗と残り秒数が出る', () => {
      renderModal();

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(HOLD_DURATION_MS / 2);
      });

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(holdButton().textContent).toContain('(3s)');
    });

    it('最後まで押し続けなければ onConfirm は呼ばれない', () => {
      const { onConfirm, onClose } = renderModal();

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(HOLD_DURATION_MS - 100);
      });

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('途中で指を離すと進捗が 0% に戻り、onConfirm は呼ばれない', () => {
      const { onConfirm } = renderModal();

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(HOLD_DURATION_MS / 2);
      });
      fireEvent.pointerUp(holdButton());

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('指を離したあとは時間が進んでも onConfirm は呼ばれない', () => {
      const { onConfirm } = renderModal();

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(HOLD_DURATION_MS / 2);
      });
      fireEvent.pointerUp(holdButton());
      act(() => {
        vi.advanceTimersByTime(HOLD_DURATION_MS);
      });

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('ボタンの外へ出ると進捗が 0% に戻る', () => {
      const { onConfirm } = renderModal();

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(HOLD_DURATION_MS / 2);
      });
      fireEvent.pointerLeave(holdButton());

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('長押しの完了', () => {
    // 進捗は requestAnimationFrame（約 16ms 刻み）で進み、ちょうどの時間では最後のフレームが届かないため 1 フレーム分余分に進める
    const PAST_HOLD_MS = HOLD_DURATION_MS + 100;

    it('最後まで押し続けると onConfirm と onClose が呼ばれる', () => {
      const { onConfirm, onClose } = renderModal();

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(PAST_HOLD_MS);
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('完了後にさらに時間が進んでも onConfirm は 1 回だけ', () => {
      const { onConfirm } = renderModal();

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(HOLD_DURATION_MS * 3);
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('長押しの秒数', () => {
    const LONG_HOLD_SECONDS = 30;
    const LONG_HOLD_MS = LONG_HOLD_SECONDS * 1000;

    it('説明文に秒数を渡す', () => {
      renderModal({ holdSeconds: LONG_HOLD_SECONDS, action: 'delete' });

      expect(
        screen.getByText('deleteBlockConfirmDescription(example.com,30)')
      ).toBeInTheDocument();
    });

    it('残り秒数は指定した秒数から数える', () => {
      renderModal({ holdSeconds: LONG_HOLD_SECONDS });

      fireEvent.pointerDown(holdButton());
      // 進捗は約 16ms 刻みのため、整数秒の境目を避けて切り上げの結果が 1 つに決まる時刻（残り 10.5 秒）で見る
      act(() => {
        vi.advanceTimersByTime(19500);
      });

      expect(holdButton().textContent).toContain('(11s)');
    });

    it('既定の 5 秒を過ぎても、指定した秒数に届くまでは確定しない', () => {
      const { onConfirm } = renderModal({ holdSeconds: LONG_HOLD_SECONDS });

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(LONG_HOLD_MS - 100);
      });

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('指定した秒数だけ押し続けると確定する', () => {
      const { onConfirm, onClose } = renderModal({
        holdSeconds: LONG_HOLD_SECONDS
      });

      fireEvent.pointerDown(holdButton());
      act(() => {
        vi.advanceTimersByTime(LONG_HOLD_MS + 100);
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('キャンセル', () => {
    it('キャンセルを押すと onClose だけが呼ばれる', () => {
      const { onConfirm, onClose } = renderModal();

      fireEvent.click(screen.getByTestId('unblock-confirm-cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
