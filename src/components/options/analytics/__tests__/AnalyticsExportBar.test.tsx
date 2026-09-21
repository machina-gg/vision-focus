import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AnalyticsExportBar } from '../AnalyticsExportBar';
import { REFRESH_SPINNER_DELAY_MS } from '~/constants/intervals';
import {
  DEFAULT_ANALYTICS,
  DEFAULT_SETTINGS,
  DEFAULT_UNBLOCK_HISTORY
} from '~/types/storage';
import type {
  AnalyticsData,
  AppSettings,
  BlockItem,
  UnblockHistory
} from '~/types/storage';

/**
 * AnalyticsExportBar の表示分岐とコールバックの検査
 *
 * CSV の書き出しは「そのデータがあるときだけ押せる」決まりなので、
 * データの有無ごとに押せるかどうかを確かめる。シェア・画像保存は
 * 途中で失敗しても成功表示を出さないことを見る。
 *
 * グラフ本体（AnalyticsChart）は描画に外部ライブラリを使い、ここでの
 * 検査対象ではないため差し替える。
 *
 * chrome.i18n はテスト環境に無く、getMessage はキー名をそのまま返す
 * （src/lib/i18n.ts）。文言の検査はキー名で行う。
 */

const exportLib = vi.hoisted(() => ({
  exportBlockList: vi.fn(),
  exportBlockCounts: vi.fn(),
  exportDailyStats: vi.fn(),
  exportUnblockedSites: vi.fn()
}));

const share = vi.hoisted(() => ({
  shareToX: vi.fn(),
  generateShareText: vi.fn(),
  captureElementAsCanvas: vi.fn(),
  copyImageToClipboard: vi.fn(),
  downloadImage: vi.fn()
}));

const analytics = vi.hoisted(() => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/export', () => exportLib);
vi.mock('~/lib/share', () => share);
vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: analytics.trackFeatureUse
}));
vi.mock('~/components/features', () => ({
  AnalyticsChart: () => <div data-testid="analytics-chart" />
}));

const blockItem = (domain: string): BlockItem => ({
  id: domain,
  domain,
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  timeLimit: null
});

const settingsWithBlockList = (domains: string[]): AppSettings => ({
  ...DEFAULT_SETTINGS,
  blockList: domains.map(blockItem)
});

const analyticsWith = (overrides: Partial<AnalyticsData>): AnalyticsData => ({
  ...DEFAULT_ANALYTICS,
  ...overrides
});

const historyWith = (domains: string[]): UnblockHistory => ({
  sites: Object.fromEntries(
    domains.map((domain) => [
      domain,
      {
        domain,
        status: 'unblocked' as const,
        blockedAt: '2026-01-01T00:00:00.000Z',
        unblockedAt: '2026-01-02T00:00:00.000Z',
        timeAfterUnblock: 0,
        lastActivity: null
      }
    ])
  )
});

function renderBar(
  overrides: Partial<React.ComponentProps<typeof AnalyticsExportBar>> = {}
) {
  const onRefresh = vi.fn().mockResolvedValue(undefined);
  const onReset = vi.fn();
  const result = render(
    <AnalyticsExportBar
      settings={null}
      analyticsData={DEFAULT_ANALYTICS}
      unblockHistory={DEFAULT_UNBLOCK_HISTORY}
      onRefresh={onRefresh}
      onReset={onReset}
      {...overrides}
    />
  );
  return { onRefresh, onReset, ...result };
}

function openExportMenu() {
  fireEvent.click(screen.getByTestId('analytics-export-button'));
}

beforeEach(() => {
  Object.values(exportLib).forEach((fn) => fn.mockReset());
  share.shareToX.mockReset();
  share.generateShareText.mockReset().mockReturnValue('共有テキスト');
  share.captureElementAsCanvas.mockReset().mockResolvedValue({});
  share.copyImageToClipboard.mockReset().mockResolvedValue(true);
  share.downloadImage.mockReset();
  analytics.trackFeatureUse.mockReset();
});

describe('AnalyticsExportBar', () => {
  describe('初期表示', () => {
    it('見出しとグラフの置き場を出す', () => {
      renderBar();

      expect(screen.getByText('trackedSitesTitle')).toBeInTheDocument();
      expect(screen.getByText('usageChart')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-chart')).toBeInTheDocument();
    });

    it('データが 1 件も無ければ書き出しボタンを押せない', () => {
      renderBar();

      expect(screen.getByTestId('analytics-export-button')).toBeDisabled();
    });

    it('ブロックリストだけでも書き出しボタンは押せる', () => {
      renderBar({ settings: settingsWithBlockList(['example.com']) });

      expect(screen.getByTestId('analytics-export-button')).toBeEnabled();
    });

    it('解除履歴だけでも書き出しボタンは押せる', () => {
      renderBar({ unblockHistory: historyWith(['example.com']) });

      expect(screen.getByTestId('analytics-export-button')).toBeEnabled();
    });

    it('ブロックリストが空配列ならデータ無しとして扱う', () => {
      renderBar({ settings: settingsWithBlockList([]) });

      expect(screen.getByTestId('analytics-export-button')).toBeDisabled();
    });
  });

  describe('書き出しメニュー', () => {
    it('データを持たない項目は押せない', () => {
      renderBar({ settings: settingsWithBlockList(['example.com']) });

      openExportMenu();

      expect(screen.getByTestId('analytics-export-blocklist')).toBeEnabled();
      expect(
        screen.getByTestId('analytics-export-block-counts')
      ).toBeDisabled();
      expect(screen.getByTestId('analytics-export-daily-stats')).toBeDisabled();
      expect(screen.getByTestId('analytics-export-unblocked')).toBeDisabled();
    });

    it('ブロックリストを書き出すと一覧が渡り、利用実績を記録する', () => {
      const settings = settingsWithBlockList(['example.com']);
      renderBar({ settings });

      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-blocklist'));

      expect(exportLib.exportBlockList).toHaveBeenCalledWith(
        settings.blockList
      );
      expect(analytics.trackFeatureUse).toHaveBeenCalledWith('csv_export');
    });

    it('書き出すとメニューは閉じる', () => {
      renderBar({ settings: settingsWithBlockList(['example.com']) });

      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-blocklist'));

      expect(
        screen.queryByTestId('analytics-export-blocklist')
      ).not.toBeInTheDocument();
    });

    it('ブロック回数を書き出すとその集計が渡る', () => {
      const siteBlockCounts = {
        'example.com': {
          domain: 'example.com',
          count: 3,
          lastBlocked: '2026-01-01T00:00:00.000Z'
        }
      };
      renderBar({ analyticsData: analyticsWith({ siteBlockCounts }) });

      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-block-counts'));

      expect(exportLib.exportBlockCounts).toHaveBeenCalledWith(siteBlockCounts);
    });

    it('日別統計を書き出すとその集計が渡る', () => {
      const dailyStats = {
        '2026-01-01': {
          date: '2026-01-01',
          wasteTime: 60,
          investTime: 0,
          blockCount: 1,
          unblockCount: 0
        }
      };
      renderBar({ analyticsData: analyticsWith({ dailyStats }) });

      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-daily-stats'));

      expect(exportLib.exportDailyStats).toHaveBeenCalledWith(dailyStats);
    });

    it('解除履歴を書き出すと履歴ごと渡る', () => {
      const unblockHistory = historyWith(['example.com']);
      renderBar({ unblockHistory });

      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-unblocked'));

      expect(exportLib.exportUnblockedSites).toHaveBeenCalledWith(
        unblockHistory
      );
    });

    it('もう一度押すとメニューは閉じる', () => {
      renderBar({ settings: settingsWithBlockList(['example.com']) });

      openExportMenu();
      openExportMenu();

      expect(
        screen.queryByTestId('analytics-export-blocklist')
      ).not.toBeInTheDocument();
    });
  });

  describe('再読み込み', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('押すと再読み込みが呼ばれ、しばらく押せなくなる', async () => {
      const { onRefresh } = renderBar();

      await act(async () => {
        fireEvent.click(screen.getByTestId('analytics-refresh-button'));
      });

      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('analytics-refresh-button')).toBeDisabled();

      await act(async () => {
        vi.advanceTimersByTime(REFRESH_SPINNER_DELAY_MS);
      });

      expect(screen.getByTestId('analytics-refresh-button')).toBeEnabled();
    });
  });

  describe('X へのシェア', () => {
    it('集計した値でシェア文を作り、成功を伝える', async () => {
      renderBar({
        analyticsData: analyticsWith({
          siteBlockCounts: {
            'a.example': {
              domain: 'a.example',
              count: 2,
              lastBlocked: '2026-01-01T00:00:00.000Z'
            },
            'b.example': {
              domain: 'b.example',
              count: 5,
              lastBlocked: '2026-01-01T00:00:00.000Z'
            }
          },
          dailyStats: {
            '2026-01-01': {
              date: '2026-01-01',
              wasteTime: 60,
              investTime: 0,
              blockCount: 1,
              unblockCount: 0
            },
            '2026-01-02': {
              date: '2026-01-02',
              wasteTime: 30,
              investTime: 0,
              blockCount: 1,
              unblockCount: 0
            }
          }
        })
      });

      await act(async () => {
        fireEvent.click(screen.getAllByTitle('shareToX')[0]);
      });

      expect(share.generateShareText).toHaveBeenCalledWith({
        totalBlockCount: 7,
        totalWasteTime: 90,
        topBlockedSite: 'b.example'
      });
      expect(share.shareToX).toHaveBeenCalledWith('共有テキスト');
      expect(screen.getByText('shareSuccess')).toBeInTheDocument();
    });

    it('集計対象が 0 件でもシェア文は作れる', async () => {
      renderBar();

      await act(async () => {
        fireEvent.click(screen.getAllByTitle('shareToX')[0]);
      });

      expect(share.generateShareText).toHaveBeenCalledWith({
        totalBlockCount: 0,
        totalWasteTime: 0,
        topBlockedSite: undefined
      });
    });

    it('画像を取れなければ失敗を伝え、シェアしない', async () => {
      share.captureElementAsCanvas.mockResolvedValue(null);
      renderBar();

      await act(async () => {
        fireEvent.click(screen.getAllByTitle('shareToX')[0]);
      });

      expect(screen.getByText('shareError')).toBeInTheDocument();
      expect(share.shareToX).not.toHaveBeenCalled();
    });

    it('クリップボードへ入れられなければ失敗を伝え、シェアしない', async () => {
      share.copyImageToClipboard.mockResolvedValue(false);
      renderBar();

      await act(async () => {
        fireEvent.click(screen.getAllByTitle('shareToX')[0]);
      });

      expect(screen.getByText('shareError')).toBeInTheDocument();
      expect(share.shareToX).not.toHaveBeenCalled();
    });

    it('途中で例外になっても失敗を伝える', async () => {
      share.captureElementAsCanvas.mockRejectedValue(new Error('canvas'));
      renderBar();

      await act(async () => {
        fireEvent.click(screen.getAllByTitle('shareToX')[0]);
      });

      expect(screen.getByText('shareError')).toBeInTheDocument();
    });
  });

  describe('画像の保存', () => {
    it('日付つきのファイル名で保存し、成功を伝える', async () => {
      const canvas = {};
      share.captureElementAsCanvas.mockResolvedValue(canvas);
      renderBar();

      await act(async () => {
        fireEvent.click(screen.getAllByTitle('downloadImage')[0]);
      });

      expect(share.downloadImage).toHaveBeenCalledWith(
        canvas,
        expect.stringMatching(/^visionfocus-analytics-\d{4}-\d{2}-\d{2}\.png$/)
      );
      expect(screen.getByText('downloadSuccess')).toBeInTheDocument();
    });

    it('画像を取れなければ失敗を伝え、保存しない', async () => {
      share.captureElementAsCanvas.mockResolvedValue(null);
      renderBar();

      await act(async () => {
        fireEvent.click(screen.getAllByTitle('downloadImage')[0]);
      });

      expect(screen.getByText('shareError')).toBeInTheDocument();
      expect(share.downloadImage).not.toHaveBeenCalled();
    });
  });

  describe('集計のリセット', () => {
    it('押すだけでは消さず、確認を出す', () => {
      const { onReset } = renderBar();

      fireEvent.click(screen.getByTestId('analytics-reset-button'));

      expect(screen.getByText('resetAnalyticsTitle')).toBeInTheDocument();
      expect(onReset).not.toHaveBeenCalled();
    });

    it('確認を押すと消して、確認を閉じる', () => {
      const { onReset } = renderBar();

      fireEvent.click(screen.getByTestId('analytics-reset-button'));
      fireEvent.click(screen.getByTestId('analytics-reset-confirm'));

      expect(onReset).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('resetAnalyticsTitle')).not.toBeInTheDocument();
    });

    it('確認を出す前は確認のダイアログを描画しない', () => {
      renderBar();

      expect(screen.queryByText('resetAnalyticsTitle')).not.toBeInTheDocument();
    });
  });
});
