import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PopupApp } from '../App';
import { formatTimeLocalized, toDateKey } from '~/lib/time';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import type { SiteKey } from '~/types/site';

stubI18nWithSubstitutions();

const sourcesState = vi.hoisted(() => ({
  activity: {} as ActivityLog,
  wasteSites: [] as SiteKey[],
  trackedSites: [] as SiteKey[]
}));

vi.mock('~/contexts/SettingsContext', async () => {
  const { DEFAULT_SETTINGS: settings } = await import('~/types/storage');
  return {
    SettingsProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useSettings: () => ({
      settings,
      vision: undefined
    })
  };
});

const storage = vi.hoisted(() => ({
  settingsItem: { key: 'local:settings', setValue: vi.fn() }
}));

const messaging = vi.hoisted(() => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/storage', () => storage);
vi.mock('~/lib/messaging', () => messaging);

vi.mock('~/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/hooks')>();
  return {
    ...actual,
    useActivitySources: () => ({
      activity: sourcesState.activity,
      wasteSites: sourcesState.wasteSites,
      trackedSites: sourcesState.trackedSites
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
      handleBlock: vi.fn()
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

function renderPopup(
  activity: ActivityLog,
  wasteSites: SiteKey[],
  trackedSites: SiteKey[] = wasteSites
) {
  sourcesState.activity = activity;
  sourcesState.wasteSites = wasteSites;
  sourcesState.trackedSites = trackedSites;
  return render(<PopupApp />);
}

beforeEach(() => {
  vi.clearAllMocks();
  messaging.sendMessage.mockResolvedValue({ success: true });
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

  it('許可サイトの時間は今日の浪費時間に入らない（浪費時間の母集団だけを数える）', () => {
    renderPopup(
      {
        [TODAY]: {
          'youtube.com': row({ seconds: 600 }),
          'music.youtube.com': row({ seconds: 3000 })
        }
      },
      ['youtube.com'],
      ['youtube.com', 'music.youtube.com']
    );

    expect(screen.getByTestId('summary-wasted-time')).toHaveTextContent(
      formatTimeLocalized(600)
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

describe('ヘッダー', () => {
  it('有効・無効を切り替えるスイッチを出さない', () => {
    renderPopup({}, []);

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});

describe('利用状況の送信への同意', () => {
  it.each([
    ['analytics-optin-allow', true],
    ['analytics-optin-deny', false]
  ])(
    '%s を押すと同意の保存を background に依頼し、保存領域に書かない',
    async (testId, enabled) => {
      renderPopup({}, []);

      await act(async () => {
        fireEvent.click(screen.getByTestId(testId));
      });

      expect(messaging.sendMessage).toHaveBeenCalledWith(
        'update-analytics-opt-in',
        { enabled }
      );
      expect(storage.settingsItem.setValue).not.toHaveBeenCalled();
    }
  );

  it('依頼を送れなくても例外にならない', async () => {
    messaging.sendMessage.mockRejectedValue(new Error('disconnected'));
    renderPopup({}, []);

    await act(async () => {
      fireEvent.click(screen.getByTestId('analytics-optin-allow'));
    });

    expect(storage.settingsItem.setValue).not.toHaveBeenCalled();
  });
});
