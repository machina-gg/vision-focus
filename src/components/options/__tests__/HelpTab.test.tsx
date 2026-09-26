import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { HelpTab } from '../HelpTab';

vi.mock('~/components/options/HelpGettingStarted', () => ({
  HelpGettingStarted: () => <div data-testid="help-getting-started" />
}));
vi.mock('~/components/options/HelpFAQ', () => ({
  HelpFAQ: () => <div data-testid="help-faq" />
}));
vi.mock('~/components/options/HelpTroubleshooting', () => ({
  HelpTroubleshooting: () => <div data-testid="help-troubleshooting" />
}));
vi.mock('~/components/features', () => ({
  SupportSection: () => <div data-testid="support-section" />
}));

describe('HelpTab', () => {
  describe('読むもの', () => {
    it('使い方・FAQ・困ったとき・支援を並べる', () => {
      render(<HelpTab />);

      expect(screen.getByTestId('help-getting-started')).toBeInTheDocument();
      expect(screen.getByTestId('help-faq')).toBeInTheDocument();
      expect(screen.getByTestId('help-troubleshooting')).toBeInTheDocument();
      expect(screen.getByTestId('support-section')).toBeInTheDocument();
    });

    it('問い合わせ先を別タブで開くリンクとして出す', () => {
      render(<HelpTab />);

      const link = screen.getByRole('link', { name: 'helpContactUs' });
      expect(link).toHaveAttribute(
        'href',
        'https://docs.google.com/forms/d/e/1FAIpQLSf3yxG71Z4YQWkoZqBMFuUb0Zxvj0DQFS9FEODjUVDQSnzXhg/viewform'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('版数を出す', () => {
      render(<HelpTab />);

      expect(screen.getByText('VisionFocus v1.0.0')).toBeInTheDocument();
    });
  });

  describe('設定の項目', () => {
    it('ブロック解除の保護・通知・データとプライバシー・バックアップを出さない', () => {
      render(<HelpTab />);

      expect(screen.queryByText('unblockProtection')).not.toBeInTheDocument();
      expect(
        screen.queryByText('notificationSettings')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('analyticsPrivacyTitle')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('settingsBackup')).not.toBeInTheDocument();
    });
  });
});
