import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SupportSection } from '../SupportSection';

/**
 * SupportSection の常設表示と、押したときに呼ばれるものの検査
 *
 * 頻度制御を持つ SupportPrompt と違い、こちらは設定画面に常設する。
 * 「表示に条件が付いていない」ことと、押したときの副作用（計測と
 * 支援ページの表示）が両方走ることを見る。
 *
 * 計測とページの表示は外部に任せる処理なので差し替える
 * （実体は GA4 への送信と chrome.tabs の呼び出しで、テストから実行できない）。
 */

const support = vi.hoisted(() => ({
  trackFeatureUse: vi.fn(async () => undefined),
  openSupportPage: vi.fn()
}));

vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: support.trackFeatureUse
}));

vi.mock('~/lib/supportPrompt', () => ({
  openSupportPage: support.openSupportPage
}));

beforeEach(() => {
  support.trackFeatureUse.mockClear();
  support.openSupportPage.mockClear();
});

describe('SupportSection', () => {
  describe('表示', () => {
    it('見出し・説明・本文を出す', () => {
      render(<SupportSection />);

      expect(screen.getByTestId('support-section-title')).toHaveTextContent(
        'supportTitle'
      );
      expect(screen.getByText('supportDescription')).toBeInTheDocument();
      expect(screen.getByText('supportBody')).toBeInTheDocument();
    });

    it('条件なしで支援ボタンを出す', () => {
      render(<SupportSection />);

      expect(screen.getByTestId('support-button')).toBeInTheDocument();
    });
  });

  describe('支援ボタンを押したとき', () => {
    it('利用を計測してから支援ページを開く', () => {
      render(<SupportSection />);

      fireEvent.click(screen.getByTestId('support-button'));

      expect(support.trackFeatureUse).toHaveBeenCalledWith('support_open');
      expect(support.openSupportPage).toHaveBeenCalledTimes(1);
    });

    it('計測の完了を待たずに支援ページを開く', () => {
      // 解決しない Promise を返しても、同じ操作の中でページが開く
      support.trackFeatureUse.mockReturnValueOnce(new Promise(() => undefined));

      render(<SupportSection />);
      fireEvent.click(screen.getByTestId('support-button'));

      expect(support.openSupportPage).toHaveBeenCalledTimes(1);
    });

    it('押した回数だけ支援ページを開く', () => {
      render(<SupportSection />);

      const button = screen.getByTestId('support-button');
      fireEvent.click(button);
      fireEvent.click(button);

      expect(support.openSupportPage).toHaveBeenCalledTimes(2);
    });
  });
});
