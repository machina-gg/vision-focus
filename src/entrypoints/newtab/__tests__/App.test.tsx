import React from 'react';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NewtabApp } from '../App';
import { openOptionsPage } from '~/lib/chromeApi';
import { sendMessage } from '~/lib/messaging';
import { toDateKey } from '~/lib/time';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import type { ActivityLog } from '~/types/activity';
import type { LastBlocked } from '~/lib/storage';
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
  lastBlocked: null as LastBlocked | null,
  images: {} as Record<string, string>,
  getBackgroundImage: vi.fn()
}));

vi.mock('~/lib/storage', () => ({
  visionItem: { key: 'local:vision' },
  settingsItem: { key: 'local:settings' },
  activityItem: { key: 'local:activity' },
  sitesItem: { key: 'local:sites' },
  hasStoredVision: async () => true,
  getBackgroundImage: storageState.getBackgroundImage,
  getLastBlocked: async () => storageState.lastBlocked,
  clearLastBlocked: async () => undefined
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

vi.mock('~/lib/messaging', () => ({
  sendMessage: vi.fn()
}));

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
    useStorageItem: (item: { key: string }) => hooksState.values[item.key],
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
    customBackgroundId: null,
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
  storageState.lastBlocked = null;
  storageState.images = {};
  storageState.getBackgroundImage.mockImplementation(
    async (imageId: string) => storageState.images[imageId] ?? null
  );
});

describe('スタイルが 1 つも無いとき', () => {
  it('ブロックされたサイトから来たら、説明文と目印が出る', async () => {
    storageState.lastBlocked = {
      domain: 'example.com',
      reason: 'always_blocked'
    };

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
    storageState.lastBlocked = {
      domain: 'example.com',
      reason: 'always_blocked'
    };

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
    storageState.lastBlocked = {
      domain: 'example.com',
      reason: 'always_blocked'
    };

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

describe('スタイルの背景画像', () => {
  const JPEG = 'data:image/jpeg;base64,/9j/AAAA';

  it('表示するスタイルの画像 1 枚だけを読み、背景に敷く', async () => {
    storageState.images = {
      'img-active': JPEG,
      'img-other': 'data:image/jpeg;base64,/9j/BBBB'
    };

    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [
          makePreset({ id: 'p1', customBackgroundId: 'img-active' }),
          makePreset({ id: 'p2', customBackgroundId: 'img-other' })
        ],
        activePresetId: 'p1'
      }
    });

    const container = await screen.findByTestId('newtab-container');
    await waitFor(() =>
      expect(container.style.backgroundImage).toBe(`url("${JPEG}")`)
    );
    expect(storageState.getBackgroundImage).toHaveBeenCalledTimes(1);
    expect(storageState.getBackgroundImage).toHaveBeenCalledWith('img-active');
  });

  it('画像の無い ID なら画像なしとして、選んだ既定の画像を敷く', async () => {
    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [
          makePreset({
            id: 'p1',
            customBackgroundId: 'img-missing',
            backgroundImage: 'default-2'
          })
        ],
        activePresetId: 'p1'
      }
    });

    const container = await screen.findByTestId('newtab-container');
    await waitFor(() =>
      expect(container.style.backgroundImage).toBe(
        'url("stub://backgrounds/default-2.webp")'
      )
    );
  });

  it('画像を持たないスタイル・既定の表示設定では読まない', async () => {
    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [makePreset({ id: 'p1' })],
        activePresetId: 'p1'
      }
    });

    await screen.findByTestId('newtab-goal-text');
    expect(storageState.getBackgroundImage).not.toHaveBeenCalled();
  });
});

describe('帯の文言はブロックの記録の理由で決まる', () => {
  const vision: VisionSettings = {
    defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
    presets: [makePreset()],
    activePresetId: 'preset-1'
  };

  it('理由が時間制限の超過なら、時間制限に達した文言を出す', async () => {
    storageState.lastBlocked = {
      domain: 'example.com',
      reason: 'time_limit_exceeded'
    };

    renderApp({ vision });

    expect(
      await screen.findByTestId('newtab-block-info-message')
    ).toHaveTextContent('timeLimitReached');
    expect(
      screen.getByText('timeLimitReachedDescription(example.com)')
    ).toBeInTheDocument();
  });

  it('理由が常時ブロックなら、ブロックリストの文言を出す', async () => {
    storageState.lastBlocked = {
      domain: 'example.com',
      reason: 'always_blocked'
    };

    renderApp({ vision });

    expect(
      await screen.findByTestId('newtab-block-info-message')
    ).toHaveTextContent('siteBlockedMessage(example.com)');
    expect(
      screen.queryByText('timeLimitReachedDescription(example.com)')
    ).not.toBeInTheDocument();
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
    storageState.lastBlocked = {
      domain: 'www.example.com',
      reason: 'always_blocked'
    };

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
    storageState.lastBlocked = {
      domain: 'other.com',
      reason: 'always_blocked'
    };

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

describe('目標の編集', () => {
  const vision: VisionSettings = {
    defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS, goalText: '今の目標' },
    presets: [],
    activePresetId: null
  };

  async function startEditing(text: string) {
    renderApp({ vision });
    fireEvent.click(await screen.findByTestId('newtab-goal-edit-button'));
    fireEvent.change(screen.getByTestId('newtab-goal-input'), {
      target: { value: text }
    });
  }

  beforeEach(() => {
    vi.mocked(sendMessage).mockResolvedValue({ success: true });
  });

  it('保存すると update-goal-text に入力を trim せずに送り、編集を閉じる', async () => {
    await startEditing(' 新しい目標 ');

    fireEvent.click(screen.getByTestId('newtab-goal-save'));

    await waitFor(() => {
      expect(screen.queryByTestId('newtab-goal-input')).not.toBeInTheDocument();
    });
    expect(sendMessage).toHaveBeenCalledWith('update-goal-text', {
      goalText: ' 新しい目標 '
    });
  });

  it('空白だけなら送らずに編集を閉じる', async () => {
    await startEditing('   ');

    fireEvent.click(screen.getByTestId('newtab-goal-save'));

    await waitFor(() => {
      expect(screen.queryByTestId('newtab-goal-input')).not.toBeInTheDocument();
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('拒まれたら文言を出して編集を続け、入力を変えると文言が消える', async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      success: false,
      error: { code: 'save-failed' }
    });
    await startEditing('新しい目標');

    fireEvent.click(screen.getByTestId('newtab-goal-save'));

    expect(await screen.findByTestId('newtab-goal-error')).toHaveTextContent(
      'errorSaveFailed'
    );
    expect(screen.getByTestId('newtab-goal-input')).toHaveValue('新しい目標');

    fireEvent.change(screen.getByTestId('newtab-goal-input'), {
      target: { value: '別の目標' }
    });

    expect(screen.queryByTestId('newtab-goal-error')).not.toBeInTheDocument();
  });

  it('送れなかったら汎用の文言を出す', async () => {
    vi.mocked(sendMessage).mockRejectedValue(new Error('disconnected'));
    await startEditing('新しい目標');

    fireEvent.click(screen.getByTestId('newtab-goal-save'));

    expect(await screen.findByTestId('newtab-goal-error')).toHaveTextContent(
      'errorOperationFailed'
    );
  });
});
