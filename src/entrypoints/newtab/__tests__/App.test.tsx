import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NewtabApp } from '../App';
import { openOptionsPage } from '~/lib/chromeApi';
import { toDateKey } from '~/lib/time';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import type { ActivityLog } from '~/types/activity';
import type { SiteKey, TrackedSites } from '~/types/site';
import type {
  AppSettings,
  DashboardPreset,
  VisionSettings
} from '~/types/storage';
import { blockedSite, sitesOf } from '~/test/sites';
import { DEFAULT_DISPLAY_SETTINGS, DEFAULT_SETTINGS } from '~/types/storage';

stubI18nWithSubstitutions();

const storageState = vi.hoisted(() => ({
  blockedDomain: null as string | null
}));

vi.mock('~/lib/storage', () => ({
  visionItem: { key: 'local:vision' },
  settingsItem: { key: 'local:settings' },
  activityItem: { key: 'local:activity' },
  sitesItem: { key: 'local:sites' },
  hasStoredVision: async () => true,
  getLastBlockedDomain: async () => storageState.blockedDomain,
  clearLastBlockedDomain: async () => undefined
}));

vi.mock('~/lib/chromeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/chromeApi')>();
  return {
    ...actual,
    openExtensionPage: vi.fn(),
    openOptionsPage: vi.fn()
  };
});

vi.mock('~/constants/backgrounds', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('~/constants/backgrounds')>();
  return {
    ...actual,
    getBackgroundUrl: (bgId: string) => `stub://backgrounds/${bgId}.webp`
  };
});

const hooksState = vi.hoisted(() => ({
  values: {} as Record<string, unknown>,
  activity: {} as ActivityLog,
  sites: [] as SiteKey[]
}));

// useResolvedPreset / useBackgroundPreload と導出は実体を通す（既定値への落ち方と導出が検査対象）
vi.mock('~/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/hooks')>();
  return {
    ...actual,
    useStorageItem: (item: { key: string }) => [
      hooksState.values[item.key],
      vi.fn()
    ],
    useActivitySources: () => ({
      activity: hooksState.activity,
      sites: hooksState.sites
    })
  };
});

// jsdom は画像を取得せず onload / onerror が発火しないため、読み込みを即座に完了させる
class ImmediateImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    this.onload?.();
  }
}

vi.stubGlobal('Image', ImmediateImage);

function makePreset(overrides: Partial<DashboardPreset> = {}): DashboardPreset {
  return {
    ...DEFAULT_DISPLAY_SETTINGS,
    id: 'preset-1',
    name: 'スタイル A',
    createdAt: '2026-01-01T00:00:00.000Z',
    goalText: 'スタイルの目標',
    ...overrides
  };
}

const TODAY = toDateKey(new Date());

function row(
  overrides: Partial<ActivityLog[string][string]> = {}
): ActivityLog[string][string] {
  return { seconds: 0, blocks: 0, unblocks: 0, ...overrides };
}

function renderApp(
  options: {
    vision?: VisionSettings;
    settings?: AppSettings;
    trackedSites?: TrackedSites;
    activity?: ActivityLog;
    sites?: SiteKey[];
  } = {}
) {
  hooksState.values = {
    'local:vision': options.vision,
    'local:settings': options.settings,
    'local:sites': options.trackedSites ?? {}
  };
  hooksState.activity = options.activity ?? {};
  hooksState.sites = options.sites ?? [];
  return render(<NewtabApp />);
}

beforeEach(() => {
  vi.clearAllMocks();
  storageState.blockedDomain = null;
});

describe('スタイルが 1 つも無いとき', () => {
  it('ブロックされたサイトから来たら、説明文と目印が出る', async () => {
    storageState.blockedDomain = 'example.com';

    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [],
        activePresetId: null
      },
      activity: { [TODAY]: { 'example.com': row({ blocks: 3 }) } },
      sites: ['example.com']
    });

    expect(await screen.findByTestId('newtab-block-info')).toBeInTheDocument();
    expect(screen.getByTestId('newtab-block-info-message')).toHaveTextContent(
      'siteBlockedMessage(example.com)'
    );
    expect(screen.getByText('blockedTimes(3)')).toBeInTheDocument();
  });

  it('スタイル作成を促す案内とボタンが出る', async () => {
    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [],
        activePresetId: null
      }
    });

    expect(await screen.findByTestId('newtab-setup-cta')).toBeInTheDocument();
    expect(screen.getByText('noPresetsDescription')).toBeInTheDocument();
  });

  it('案内のボタンを押すと設定画面が開く', async () => {
    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [],
        activePresetId: null
      }
    });

    fireEvent.click(await screen.findByTestId('newtab-setup-cta'));

    expect(openOptionsPage).toHaveBeenCalledTimes(1);
  });

  it('保存データそのものが無くても、目標欄まで描かれる', async () => {
    // 初めて使う利用者（vision が未保存）。既定値へ落ちることを見る
    storageState.blockedDomain = 'example.com';

    renderApp();

    expect(await screen.findByTestId('newtab-goal-text')).toHaveTextContent(
      'noGoalSet'
    );
    expect(screen.getByTestId('newtab-block-info')).toBeInTheDocument();
    expect(screen.getByTestId('newtab-setup-cta')).toBeInTheDocument();
  });
});

describe('スタイルがあるとき', () => {
  it('スタイル作成を促す案内は出ない', async () => {
    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [makePreset()],
        activePresetId: 'preset-1'
      }
    });

    expect(await screen.findByTestId('newtab-goal-text')).toHaveTextContent(
      'スタイルの目標'
    );
    expect(screen.queryByTestId('newtab-setup-cta')).not.toBeInTheDocument();
    expect(screen.queryByText('noPresetsDescription')).not.toBeInTheDocument();
  });

  it('ブロックされたサイトから来たら、説明文と目印が出る', async () => {
    storageState.blockedDomain = 'example.com';

    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [makePreset()],
        activePresetId: 'preset-1'
      }
    });

    expect(await screen.findByTestId('newtab-block-info')).toBeInTheDocument();
    expect(screen.getByTestId('newtab-block-info-message')).toHaveTextContent(
      'siteBlockedMessage(example.com)'
    );
  });
});

describe('数値は activity から導出する', () => {
  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return toDateKey(d);
  }

  const vision: VisionSettings = {
    defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
    presets: [makePreset()],
    activePresetId: 'preset-1'
  };

  it('ミニ統計の今日のブロック数は、追跡中のサイトの今日の行だけを数える', async () => {
    renderApp({
      vision,
      activity: {
        [TODAY]: {
          'example.com': row({ blocks: 2 }),
          'x.com': row({ blocks: 1 }),
          'untracked.com': row({ blocks: 5 })
        },
        [daysAgo(1)]: { 'example.com': row({ blocks: 7 }) }
      },
      sites: ['example.com', 'x.com']
    });

    expect(await screen.findByTestId('newtab-block-count')).toHaveTextContent(
      /^3$/
    );
  });

  it('今日のブロックが 0 件ならミニ統計は 0 を出す', async () => {
    renderApp({
      vision,
      activity: { [daysAgo(1)]: { 'example.com': row({ blocks: 4 }) } },
      sites: ['example.com']
    });

    expect(await screen.findByTestId('newtab-block-count')).toHaveTextContent(
      /^0$/
    );
  });

  it('ブロック画面の回数と浪費時間は、ホスト名が属するサイトの保持期間全体の合計', async () => {
    // www. 付きのホスト名でも、書き手と同じ規則で追跡中のサイトに引き直す
    storageState.blockedDomain = 'www.example.com';

    renderApp({
      vision,
      activity: {
        [TODAY]: { 'example.com': row({ blocks: 1, seconds: 60 }) },
        [daysAgo(365)]: { 'example.com': row({ blocks: 2, seconds: 60 }) },
        // 保持期間の外（daily-cleanup が消す日）は数えない
        [daysAgo(366)]: { 'example.com': row({ blocks: 100, seconds: 999 }) }
      },
      sites: ['example.com']
    });

    const banner = await screen.findByTestId('newtab-block-info');
    expect(banner).toHaveTextContent('blockedTimes(3)');
    expect(banner).toHaveTextContent('wastedTime(');
  });

  it('追跡中のどのサイトにも属さないホスト名なら回数は 0 で、浪費時間は出さない', async () => {
    storageState.blockedDomain = 'other.com';

    renderApp({
      vision,
      activity: { [TODAY]: { 'example.com': row({ blocks: 1, seconds: 60 }) } },
      sites: ['example.com']
    });

    const banner = await screen.findByTestId('newtab-block-info');
    expect(banner).toHaveTextContent('blockedTimes(0)');
    expect(banner).not.toHaveTextContent('wastedTime(');
  });

  it('ブロック中のサイト一覧の回数は、サイトの保持期間全体の合計', async () => {
    renderApp({
      vision,
      settings: DEFAULT_SETTINGS,
      trackedSites: sitesOf(blockedSite('example.com')),
      activity: {
        [TODAY]: { 'example.com': row({ blocks: 1 }) },
        [daysAgo(30)]: { 'example.com': row({ blocks: 4 }) }
      },
      sites: ['example.com']
    });

    fireEvent.click(await screen.findByTestId('newtab-blocked-sites-toggle'));

    expect(screen.getByText('blockedTimesShort(5)')).toBeInTheDocument();
  });
});

describe('壁紙のダウンロードボタン', () => {
  it('表示の準備ができた最初の描画から出ている（後続の再描画を待たない）', async () => {
    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [],
        activePresetId: null
      }
    });

    // ボタンを findBy で待つと、無関係な再描画でだけ出る実装でも通るため getBy で見る
    await screen.findByTestId('newtab-setup-cta');
    expect(screen.getByTestId('newtab-download-button')).toBeInTheDocument();
  });
});
