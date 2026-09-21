import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { UnblockConfirmModal } from '../UnblockConfirmModal';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * UnblockConfirmModal の表示分岐とコールバックの検査
 *
 * ブロック解除・削除は取り消せないため、長押しを最後まで続けたときだけ
 * onConfirm が呼ばれることを確かめる。途中で指を離した・領域から出た場合に
 * 解除されてしまうと、意図しない解除が起きる。
 */

// 置換値（ドメイン名・スタイル名）が描画結果に現れるよう chrome.i18n を差し替える
stubI18nWithSubstitutions();

const HOLD_DURATION_MS = 5000;

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
    it('解除のときは解除の説明をドメイン名つきで出す', () => {
      renderModal({ action: 'toggle' });

      expect(
        screen.getByText('unblockConfirmDescription(example.com)')
      ).toBeInTheDocument();
    });

    it('削除のときは削除の説明をドメイン名つきで出す', () => {
      renderModal({ action: 'delete' });

      expect(
        screen.getByText('deleteBlockConfirmDescription(example.com)')
      ).toBeInTheDocument();
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

    // 解除と削除はアイコンでしか区別できないため、lucide が付ける
    // クラス名（lucide-<アイコン名>）で判別する
    it('削除のときはゴミ箱のアイコンを使う', () => {
      const { container } = renderModal({ action: 'delete' });

      expect(container.querySelector('.lucide-trash2')).not.toBeNull();
    });

    it('解除のときは盾のアイコンを使う', () => {
      const { container } = renderModal({ action: 'toggle' });

      expect(container.querySelector('.lucide-shield-off')).not.toBeNull();
      expect(container.querySelector('.lucide-trash2')).toBeNull();
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
    // 進捗は requestAnimationFrame（約 16ms 刻み）で進むため、ちょうど
    // HOLD_DURATION_MS だけ進めると最後のフレームが 5000ms に届かない。
    // 完了を見る検査では 1 フレーム分を余分に進める
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

  describe('キャンセル', () => {
    it('キャンセルを押すと onClose だけが呼ばれる', () => {
      const { onConfirm, onClose } = renderModal();

      fireEvent.click(screen.getByTestId('unblock-confirm-cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
