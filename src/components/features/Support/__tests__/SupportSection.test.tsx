import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SupportSection } from '../SupportSection';

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
