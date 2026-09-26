import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SettingsDataPrivacy } from '../SettingsDataPrivacy';
import type { AnalyticsOptIn } from '~/types/analytics';
import type { AppSettings } from '~/types/storage';

const NOW = new Date('2026-03-10T12:00:00.000Z');

const settingsOf = (
  analyticsOptIn: AnalyticsOptIn | null | undefined
): AppSettings => ({ analyticsOptIn }) as AppSettings;

function renderSection(settings: AppSettings | undefined) {
  const onAnalyticsOptInChange = vi.fn(async () => undefined);
  const result = render(
    <SettingsDataPrivacy
      settings={settings}
      onAnalyticsOptInChange={onAnalyticsOptInChange}
    />
  );
  return { ...result, onAnalyticsOptInChange };
}

const toggle = () => screen.getByTestId('analytics-optin-toggle');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SettingsDataPrivacy', () => {
  describe('表示', () => {
    it('見出しと説明を出す', () => {
      renderSection(undefined);

      expect(screen.getByText('analyticsPrivacyTitle')).toBeInTheDocument();
      expect(
        screen.getByText('analyticsPrivacyDescription')
      ).toBeInTheDocument();
      expect(screen.getByText('analyticsShareStats')).toBeInTheDocument();
    });
  });

  describe('切り替えの初期状態', () => {
    it('設定が読めていないときは共有しない側になる', () => {
      renderSection(undefined);

      expect(toggle()).toHaveAttribute('aria-checked', 'false');
    });

    it('まだ決めていない（null）ときも共有しない側になる', () => {
      renderSection(settingsOf(null));

      expect(toggle()).toHaveAttribute('aria-checked', 'false');
    });

    it('拒否済みのときは共有しない側になる', () => {
      renderSection(
        settingsOf({ enabled: false, decidedAt: '2026-01-01T00:00:00.000Z' })
      );

      expect(toggle()).toHaveAttribute('aria-checked', 'false');
    });

    it('許可済みのときは共有する側になる', () => {
      renderSection(
        settingsOf({ enabled: true, decidedAt: '2026-01-01T00:00:00.000Z' })
      );

      expect(toggle()).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('切り替えたとき', () => {
    it('共有しない状態から入れると、許可と決定時刻を渡す', () => {
      const { onAnalyticsOptInChange } = renderSection(undefined);

      fireEvent.click(toggle());

      expect(onAnalyticsOptInChange).toHaveBeenCalledWith({
        enabled: true,
        decidedAt: NOW.toISOString()
      });
    });

    it('共有する状態から外すと、拒否と決定時刻を渡す', () => {
      const { onAnalyticsOptInChange } = renderSection(
        settingsOf({ enabled: true, decidedAt: '2026-01-01T00:00:00.000Z' })
      );

      fireEvent.click(toggle());

      expect(onAnalyticsOptInChange).toHaveBeenCalledWith({
        enabled: false,
        decidedAt: NOW.toISOString()
      });
    });
  });
});
