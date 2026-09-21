import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Modal } from '../Modal';

/**
 * Modal の開閉と、見出しの有無で変わる描画の検査
 *
 * 閉じているときは中身を一切出さない（閉じたはずのフォームが背後に
 * 残らない）ことと、閉じる手段（見出しの × ・背景）がどれも onClose を
 * 呼ぶことを見る。size は max-width のクラス名にしか出ないため検査しない。
 */

describe('Modal', () => {
  describe('閉じているとき', () => {
    it('中身を描画しない', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()} title="確認">
          <p>本文</p>
        </Modal>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('本文')).not.toBeInTheDocument();
      expect(screen.queryByText('確認')).not.toBeInTheDocument();
    });
  });

  describe('開いているとき', () => {
    it('ダイアログとして中身を描画する', () => {
      render(
        <Modal isOpen onClose={vi.fn()}>
          <p>本文</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('本文')).toBeInTheDocument();
    });

    it('背景をクリックすると onClose が呼ばれる', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen onClose={onClose}>
          <p>本文</p>
        </Modal>
      );

      // 背景は role を持たないため、ダイアログの直前の兄弟として取る
      const backdrop = screen.getByRole('dialog').previousElementSibling;
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop as Element);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('title を渡さないとき', () => {
    it('見出しも閉じるボタンも出さない', () => {
      render(
        <Modal isOpen onClose={vi.fn()}>
          <p>本文</p>
        </Modal>
      );

      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('title を渡したとき', () => {
    it('見出しに渡した文字を出す', () => {
      render(
        <Modal isOpen onClose={vi.fn()} title="本当に削除しますか">
          <p>本文</p>
        </Modal>
      );

      expect(
        screen.getByRole('heading', { name: '本当に削除しますか' })
      ).toBeInTheDocument();
    });

    it('空文字のときは見出しを出さない', () => {
      render(
        <Modal isOpen onClose={vi.fn()} title="">
          <p>本文</p>
        </Modal>
      );

      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('閉じるボタンを押すと onClose が呼ばれる', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen onClose={onClose} title="確認">
          <p>本文</p>
        </Modal>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
