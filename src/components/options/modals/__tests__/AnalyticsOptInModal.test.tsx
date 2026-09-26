import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AnalyticsOptInModal } from '../AnalyticsOptInModal';
import type { AnalyticsOptIn } from '~/types/analytics';
import type { AppSettings } from '~/types/storage';

const settingsState = vi.hoisted(() => ({
  settings: undefined as AppSettings | undefined
}));

vi.mock('~/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: settingsState.settings,
    setSettings: vi.fn(),
    vision: undefined,
    setVision: vi.fn()
  })
}));

const settingsOf = (
  analyticsOptIn: AnalyticsOptIn | null | undefined
): AppSettings => ({ analyticsOptIn }) as AppSettings;

const decided = (enabled: boolean): AnalyticsOptIn => ({
  enabled,
  decidedAt: '2026-03-01T00:00:00.000Z'
});

function renderModal(settings: AppSettings | undefined) {
  settingsState.settings = settings;

  const onAllow = vi.fn();
  const onDeny = vi.fn();
  const result = render(
    <AnalyticsOptInModal onAllow={onAllow} onDeny={onDeny} />
  );
  return { ...result, onAllow, onDeny };
}

beforeEach(() => {
  settingsState.settings = undefined;
});

describe('AnalyticsOptInModal', () => {
  describe('まだ決めていないとき', () => {
    it('設定そのものが読めていなければ出す', () => {
      renderModal(undefined);

      expect(screen.getByTestId('analytics-optin-modal')).toBeInTheDocument();
    });

    it('未決定（null）のときも出す', () => {
      renderModal(settingsOf(null));

      expect(screen.getByTestId('analytics-optin-modal')).toBeInTheDocument();
    });

    it('見出し・説明・許可と拒否のボタンを出す', () => {
      renderModal(settingsOf(null));

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('analyticsOptInTitle')).toBeInTheDocument();
      expect(screen.getByText('analyticsOptInDescription')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-optin-allow')).toHaveTextContent(
        'analyticsOptInAllow'
      );
      expect(screen.getByTestId('analytics-optin-deny')).toHaveTextContent(
        'analyticsOptInDeny'
      );
    });
  });

  describe('すでに決めているとき', () => {
    it('許可済みなら何も描画しない', () => {
      const { container } = renderModal(settingsOf(decided(true)));

      expect(container).toBeEmptyDOMElement();
    });

    it('拒否済みなら何も描画しない（聞き直さない）', () => {
      const { container } = renderModal(settingsOf(decided(false)));

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('操作', () => {
    it('許可を押すと onAllow だけが呼ばれる', () => {
      const { onAllow, onDeny } = renderModal(settingsOf(null));

      fireEvent.click(screen.getByTestId('analytics-optin-allow'));

      expect(onAllow).toHaveBeenCalledTimes(1);
      expect(onDeny).not.toHaveBeenCalled();
    });

    it('拒否を押すと onDeny だけが呼ばれる', () => {
      const { onAllow, onDeny } = renderModal(settingsOf(null));

      fireEvent.click(screen.getByTestId('analytics-optin-deny'));

      expect(onDeny).toHaveBeenCalledTimes(1);
      expect(onAllow).not.toHaveBeenCalled();
    });
  });
});
