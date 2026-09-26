import React from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PopupApp } from '../App';
import { formatTimeLocalized, toDateKey } from '~/lib/time';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import type { SiteKey } from '~/types/site';

stubI18nWithSubstitutions();

const sourcesState = vi.hoisted(() => ({
  activity: {} as ActivityLog,
  sites: [] as SiteKey[]
}));

vi.mock('~/contexts/SettingsContext', async () => {
  const { DEFAULT_SETTINGS: settings } = await import('~/types/storage');
  return {
    SettingsProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useSettings: () => ({
      settings,
      setSettings: vi.fn(),
      vision: undefined,
      setVision: vi.fn()
    })
  };
});

vi.mock('~/lib/storage', () => ({
  settingsItem: { key: 'local:settings' }
}));

vi.mock('~/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/hooks')>();
  return {
    ...actual,
    useActivitySources: () => ({
      activity: sourcesState.activity,
      sites: sourcesState.sites
    }),
    useCurrentDomain: () => ({
      currentDomain: null,
      timeLimitInfo: null,
      clearDomain: vi.fn()
    }),
    usePopupActions: () => ({
      handleSettingsClick: vi.fn(),
      handleHelpClick: vi.fn(),
      handleAnalyticsClick: vi.fn(),
      handleGoalClick: vi.fn(),
      handleBlock: vi.fn(),
      handlePausedChange: vi.fn(),
      isPasswordProtected: false
    }),
    usePasswordVerification: () => ({
      showModal: false,
      openModal: vi.fn(),
      closeModal: vi.fn()
    })
  };
});

const TODAY = toDateKey(new Date());

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

function row(overrides: Partial<DailySiteActivity> = {}): DailySiteActivity {
  return { seconds: 0, blocks: 0, unblocks: 0, ...overrides };
}

function renderPopup(activity: ActivityLog, sites: SiteKey[]) {
  sourcesState.activity = activity;
  sourcesState.sites = sites;
  return render(<PopupApp />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('今日のサマリー', () => {
  it('追跡中のサイトの今日の行から、ブロック数・浪費時間・解除数・トップを出す', () => {
    renderPopup(
      {
        [TODAY]: {
          'a.com': row({ blocks: 1, seconds: 60, unblocks: 1 }),
          'b.com': row({ blocks: 3, seconds: 120 }),
          // 追跡中でないサイトの行は数えない
          'untracked.com': row({ blocks: 9, seconds: 999, unblocks: 9 })
        },
        // 全期間ではなく今日の中で順位を付ける
        [yesterday()]: { 'a.com': row({ blocks: 50 }) }
      },
      ['a.com', 'b.com']
    );

    expect(screen.getByTestId('summary-block-count')).toHaveTextContent(/^4$/);
    expect(screen.getByTestId('summary-unblock-count')).toHaveTextContent(
      /^1$/
    );
    expect(screen.getByTestId('summary-top-blocked-site')).toHaveTextContent(
      /^b\.com$/
    );
    expect(screen.getByText('blockedTimesShort(3)')).toBeInTheDocument();
    expect(
      screen.queryByTestId('summary-no-blocked-sites')
    ).not.toBeInTheDocument();
  });

  it('浪費時間は追跡中のサイトの今日の表示時間の合計', () => {
    renderPopup(
      {
        [TODAY]: {
          'a.com': row({ seconds: 1800 }),
          'b.com': row({ seconds: 1800 }),
          'untracked.com': row({ seconds: 7200 })
        }
      },
      ['a.com', 'b.com']
    );

    expect(screen.getByTestId('summary-wasted-time')).toHaveTextContent(
      formatTimeLocalized(3600)
    );
  });

  it('今日のブロックが 0 件なら、ブロック数は 0 でトップは「まだなし」を出す', () => {
    renderPopup(
      {
        [TODAY]: { 'a.com': row({ seconds: 60 }) },
        [yesterday()]: { 'a.com': row({ blocks: 5 }) }
      },
      ['a.com']
    );

    expect(screen.getByTestId('summary-block-count')).toHaveTextContent(/^0$/);
    expect(screen.getByTestId('summary-no-blocked-sites')).toHaveTextContent(
      'noBlockedSitesYet'
    );
    expect(
      screen.queryByTestId('summary-top-blocked-site')
    ).not.toBeInTheDocument();
  });
});
