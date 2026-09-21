import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NewtabApp } from '../App';
import { openOptionsPage } from '~/lib/chromeApi';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import type {
  AppSettings,
  DashboardPreset,
  VisionSettings
} from '~/types/storage';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

/**
 * 新規タブ（ブロック画面）の出し分けの検査
 *
 * ブロック画面は 1 つだけで、スタイル（プリセット）の有無で別画面に
 * 分岐しない（machina-gg/vision-focus#449）。スタイルが 1 つも無くても
 * ブロックの説明と目印が出ること、スタイル作成の案内だけが出し分けられる
 * ことを見る。段組み・配色のクラス名は検査しない。
 */

// 置換値（ドメイン名・件数）が描画に出ているかを見るため
stubI18nWithSubstitutions();

const storageState = vi.hoisted(() => ({
  blockedDomain: null as string | null,
  blockCount: 0,
  wastedTime: 0
}));

// ストレージの実体は chrome.storage を読みに行くため、値をテストから決められない
vi.mock('~/lib/storage', () => ({
  visionItem: { key: 'local:vision' },
  settingsItem: { key: 'local:settings' },
  analyticsItem: { key: 'local:analytics' },
  hasStoredVision: async () => true,
  getLastBlockedDomain: async () => storageState.blockedDomain,
  getSiteBlockCount: async () => storageState.blockCount,
  getSiteWastedTime: async () => storageState.wastedTime,
  clearLastBlockedDomain: async () => undefined
}));

// 設定画面を開くのは拡張機能 API の責務（E2E で見る）
vi.mock('~/lib/chromeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/chromeApi')>();
  return {
    ...actual,
    openExtensionPage: vi.fn(),
    openOptionsPage: vi.fn()
  };
});

// 背景画像の URL は chrome.runtime.getURL を経由する（テスト環境には無い）
vi.mock('~/constants/backgrounds', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('~/constants/backgrounds')>();
  return {
    ...actual,
    getBackgroundUrl: (bgId: string) => `stub://backgrounds/${bgId}.webp`
  };
});

const hooksState = vi.hoisted(() => ({
  values: {} as Record<string, unknown>
}));

// 表示の出し分けは vision / settings の中身で決まるため、値を差し替える。
// useResolvedPreset と useBackgroundPreload は実体のまま使う
// （スタイル不在で既定値へ落ちることが検査対象のため）
vi.mock('~/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/hooks')>();
  return {
    ...actual,
    useStorageItem: (item: { key: string }) => [
      hooksState.values[item.key],
      vi.fn()
    ],
    useBackgroundStats: () => ({
      wasteTime: 0,
      investTime: 0,
      blockCount: 0,
      unblockCount: 0,
      topBlockedSite: null
    })
  };
});

/**
 * 背景画像の読み込みが完了する Image のスタブ
 *
 * jsdom は画像を取得しないため onload / onerror がどちらも発火せず、
 * 実体のままでは背景の読み込み待ち（空のコンテナ）から先へ進まない。
 */
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

function renderApp(
  options: {
    vision?: VisionSettings;
    settings?: AppSettings;
  } = {}
) {
  hooksState.values = {
    'local:vision': options.vision,
    'local:settings': options.settings,
    'local:analytics': undefined
  };
  return render(<NewtabApp />);
}

beforeEach(() => {
  vi.clearAllMocks();
  storageState.blockedDomain = null;
  storageState.blockCount = 0;
  storageState.wastedTime = 0;
});

describe('スタイルが 1 つも無いとき', () => {
  it('ブロックされたサイトから来たら、説明文と目印が出る', async () => {
    storageState.blockedDomain = 'example.com';
    storageState.blockCount = 3;

    renderApp({
      vision: {
        defaultSettings: { ...DEFAULT_DISPLAY_SETTINGS },
        presets: [],
        activePresetId: null
      }
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
    storageState.blockCount = 1;

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
