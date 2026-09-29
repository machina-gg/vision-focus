import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OptionsApp } from '../App';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import type { AppSettings } from '~/types/storage';
import { DEFAULT_SETTINGS } from '~/types/storage';

stubI18nWithSubstitutions();

const context = vi.hoisted(() => ({
  settings: undefined as AppSettings | undefined
}));

const storage = vi.hoisted(() => ({
  settingsItem: { key: 'local:settings', setValue: vi.fn() },
  visionItem: { key: 'local:vision', setValue: vi.fn() },
  sitesItem: { key: 'local:sites', setValue: vi.fn() },
  getSettings: vi.fn(),
  getVision: vi.fn(),
  getSites: vi.fn()
}));

const messaging = vi.hoisted(() => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/storage', () => storage);
vi.mock('~/lib/messaging', () => messaging);

vi.mock('~/contexts/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useSettings: () => ({ settings: context.settings, vision: undefined })
}));

vi.mock('~/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/hooks')>();
  return {
    ...actual,
    useActivitySources: () => ({
      activity: {},
      wasteSites: [],
      trackedSites: []
    }),
    useAnalytics: () => ({}),
    useSchedules: () => ({
      showScheduleModal: false,
      scheduleForm: { name: '', startTime: '', endTime: '', days: [] }
    }),
    useStorageItem: () => ({}),
    useSupportPrompt: () => ({ isVisible: false }),
    useYouTubeSettings: () => ({ handleYouTubeChange: vi.fn() })
  };
});

function renderSettingsTab() {
  window.location.hash = '#settings';
  return render(<OptionsApp />);
}

async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

function switchNear(text: string): HTMLElement {
  const row = screen.getByText(text).closest('.justify-between');
  const toggle = row?.querySelector<HTMLElement>('[role="switch"]');
  if (!toggle) throw new Error(`${text} の横にスイッチが無い`);
  return toggle;
}

function expectNoStorageWrite() {
  expect(storage.settingsItem.setValue).not.toHaveBeenCalled();
  expect(storage.visionItem.setValue).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  context.settings = {
    ...DEFAULT_SETTINGS,
    analyticsOptIn: { enabled: false, decidedAt: '2026-01-01T00:00:00.000Z' }
  };
  messaging.sendMessage.mockResolvedValue({ success: true });
});

afterEach(() => {
  window.location.hash = '';
});

describe('設定タブ', () => {
  it('長押しの秒数を選び直すと、保存を background に依頼し、保存領域に書かない', async () => {
    renderSettingsTab();

    await act(async () => {
      fireEvent.change(
        screen.getByRole('combobox', { name: 'unblockHoldSeconds' }),
        { target: { value: '60' } }
      );
    });

    expect(messaging.sendMessage).toHaveBeenCalledWith(
      'update-unblock-confirm',
      { unblockConfirm: { holdSeconds: 60 } }
    );
    expectNoStorageWrite();
  });

  it('通知のスイッチを切り替えると、通知設定の保存を background に依頼し、保存領域に書かない', async () => {
    renderSettingsTab();

    await click(switchNear('notificationTimeLimitEnabled'));

    expect(messaging.sendMessage).toHaveBeenCalledWith('update-notifications', {
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        timeLimitEnabled: !DEFAULT_SETTINGS.notifications.timeLimitEnabled
      }
    });
    expectNoStorageWrite();
  });

  it('利用統計の共有を切り替えると、同意の保存を background に依頼し、保存領域に書かない', async () => {
    renderSettingsTab();

    await click(screen.getByTestId('analytics-optin-toggle'));

    expect(messaging.sendMessage).toHaveBeenCalledWith(
      'update-analytics-opt-in',
      { enabled: true }
    );
    expectNoStorageWrite();
  });

  it('依頼が失敗しても例外にならず、表示は保存値のまま', async () => {
    messaging.sendMessage.mockResolvedValue({
      success: false,
      error: { code: 'save-failed' }
    });
    renderSettingsTab();

    await click(screen.getByTestId('analytics-optin-toggle'));

    expect(screen.getByTestId('analytics-optin-toggle')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expectNoStorageWrite();
  });

  it('依頼を送れなくても例外にならない', async () => {
    messaging.sendMessage.mockRejectedValue(new Error('disconnected'));
    renderSettingsTab();

    await click(screen.getByTestId('analytics-optin-toggle'));

    expectNoStorageWrite();
  });
});

describe('利用状況の送信への同意のダイアログ', () => {
  beforeEach(() => {
    context.settings = { ...DEFAULT_SETTINGS, analyticsOptIn: null };
  });

  it.each([
    ['analytics-optin-allow', true],
    ['analytics-optin-deny', false]
  ])(
    '%s を押すと同意の保存を background に依頼し、保存領域に書かない',
    async (testId, enabled) => {
      renderSettingsTab();

      await click(screen.getByTestId(testId));

      expect(messaging.sendMessage).toHaveBeenCalledWith(
        'update-analytics-opt-in',
        { enabled }
      );
      expectNoStorageWrite();
    }
  );
});
