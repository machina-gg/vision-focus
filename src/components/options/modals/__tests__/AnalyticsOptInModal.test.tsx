import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AnalyticsOptInModal } from '../AnalyticsOptInModal';
import type { AnalyticsOptIn } from '~/types/analytics';
import type { AppSettings } from '~/types/storage';

/**
 * AnalyticsOptInModal の「まだ決めていないときだけ出す」判定の検査
 *
 * 未設定（undefined）と未決定（null）は別の値だが、どちらも「聞いていない」
 * として同じ扱いになる。許可・拒否のどちらかを選んだ後に聞き直さないことが
 * 要点なので、enabled が false の場合も出ないことを含める。
 *
 * 設定は SettingsContext から来るため Context ごと差し替える
 * （実体は chrome.storage を読みに行き、テストから値を決められない）。
 */

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

/** 検査に使うキーだけを持つ設定（他のキーは表示に関わらない） */
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
