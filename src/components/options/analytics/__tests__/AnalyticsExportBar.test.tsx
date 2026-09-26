import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AnalyticsExportBar } from '../AnalyticsExportBar';
import {
  MAX_HISTORY_DAYS_FALLBACK,
  REFRESH_SPINNER_DELAY_MS
} from '~/constants/intervals';
import { toDateKey } from '~/lib/time';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import type { TrackedSites } from '~/types/site';

/**
 * AnalyticsExportBar の表示分岐とコールバックの検査
 *
 * CSV の書き出しは「そのデータがあるときだけ押せる」決まりなので、
 * データの有無ごとに押せるかどうかを確かめる。CSV と X シェア文の数値は、
 * 保持期間全体・追跡中のサイトの activity から出る。シェア・画像保存は
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
  exportSiteBlockCounts: vi.fn(),
  exportDailyActivity: vi.fn(),
  exportUnblockedSiteTimes: vi.fn()
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

/** ブロック設定を持つサイトだけの追跡中のサイト */
const blockListOf = (domains: string[]): TrackedSites =>
  sitesOf(...domains.map((domain) => blockedSite(domain)));

/** 追跡だけのサイト（数値の母集団） */
const trackedOf = (domains: string[]): TrackedSites =>
  sitesOf(...domains.map((domain) => trackedSite(domain)));

const row = (values: Partial<DailySiteActivity>): DailySiteActivity => ({
  seconds: 0,
  blocks: 0,
  unblocks: 0,
  ...values
});

const daysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateKey(d);
};

function renderBar(
  overrides: Partial<React.ComponentProps<typeof AnalyticsExportBar>> = {}
) {
  const onRefresh = vi.fn().mockResolvedValue(undefined);
  const onReset = vi.fn();
  const result = render(
    <AnalyticsExportBar
      activity={{}}
      trackedSites={{}}
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
      renderBar({ trackedSites: blockListOf(['example.com']) });

      expect(screen.getByTestId('analytics-export-button')).toBeEnabled();
    });

    it('解除の記録だけでも書き出しボタンは押せる', () => {
      renderBar({
        activity: { [daysAgo(0)]: { 'example.com': row({ unblocks: 1 }) } },
        trackedSites: trackedOf(['example.com'])
      });

      expect(screen.getByTestId('analytics-export-button')).toBeEnabled();
    });

    it('母集団の外のサイトの記録しか無ければデータ無しとして扱う', () => {
      renderBar({
        activity: { [daysAgo(0)]: { 'untracked.com': row({ blocks: 3 }) } },
        trackedSites: trackedOf(['example.com'])
      });

      expect(screen.getByTestId('analytics-export-button')).toBeDisabled();
    });

    it('youtube.com のブロック設定しか無ければブロックリストは空として扱う（YouTube の節が担当する）', () => {
      renderBar({ trackedSites: blockListOf([YOUTUBE_DOMAIN]) });

      expect(screen.getByTestId('analytics-export-button')).toBeDisabled();
    });

    it('ブロックリストが空配列ならデータ無しとして扱う', () => {
      renderBar({ trackedSites: blockListOf([]) });

      expect(screen.getByTestId('analytics-export-button')).toBeDisabled();
    });
  });

  describe('書き出しメニュー', () => {
    it('データを持たない項目は押せない', () => {
      renderBar({ trackedSites: blockListOf(['example.com']) });

      openExportMenu();

      expect(screen.getByTestId('analytics-export-blocklist')).toBeEnabled();
      expect(
        screen.getByTestId('analytics-export-block-counts')
      ).toBeDisabled();
      expect(screen.getByTestId('analytics-export-daily-stats')).toBeDisabled();
      expect(screen.getByTestId('analytics-export-unblocked')).toBeDisabled();
    });

    it('ブロックリストを書き出すと一覧が渡り、利用実績を記録する', () => {
      const trackedSites = blockListOf(['example.com']);
      renderBar({ trackedSites });

      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-blocklist'));

      expect(exportLib.exportBlockList).toHaveBeenCalledWith(trackedSites);
      expect(analytics.trackFeatureUse).toHaveBeenCalledWith('csv_export');
    });

    it('書き出すとメニューは閉じる', () => {
      renderBar({ trackedSites: blockListOf(['example.com']) });

      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-blocklist'));

      expect(
        screen.queryByTestId('analytics-export-blocklist')
      ).not.toBeInTheDocument();
    });

    it('ブロック回数・日別統計・解除サイトは activity と母集団と保持期間で書き出す', () => {
      const activity: ActivityLog = {
        [daysAgo(0)]: {
          'example.com': row({ seconds: 60, blocks: 3, unblocks: 1 })
        }
      };
      const sites = ['example.com'];
      renderBar({ activity, trackedSites: trackedOf(sites) });
      const retention = {
        from: daysAgo(MAX_HISTORY_DAYS_FALLBACK),
        to: daysAgo(0)
      };

      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-block-counts'));
      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-daily-stats'));
      openExportMenu();
      fireEvent.click(screen.getByTestId('analytics-export-unblocked'));

      expect(exportLib.exportSiteBlockCounts).toHaveBeenCalledWith(
        activity,
        sites,
        retention
      );
      expect(exportLib.exportDailyActivity).toHaveBeenCalledWith(
        activity,
        sites,
        retention
      );
      expect(exportLib.exportUnblockedSiteTimes).toHaveBeenCalledWith(
        activity,
        sites,
        daysAgo(0)
      );
      expect(analytics.trackFeatureUse).toHaveBeenCalledTimes(3);
    });

    it('もう一度押すとメニューは閉じる', () => {
      renderBar({ trackedSites: blockListOf(['example.com']) });

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
    it('保持期間・追跡中のサイトの合計でシェア文を作り、成功を伝える', async () => {
      renderBar({
        activity: {
          [daysAgo(0)]: {
            'a.example': row({ seconds: 60, blocks: 2 }),
            'untracked.com': row({ seconds: 999, blocks: 99 })
          },
          [daysAgo(1)]: { 'b.example': row({ seconds: 30, blocks: 5 }) },
          // 保持期間より古い日は数えない
          [daysAgo(MAX_HISTORY_DAYS_FALLBACK + 1)]: {
            'a.example': row({ seconds: 999, blocks: 99 })
          }
        },
        trackedSites: trackedOf(['a.example', 'b.example'])
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
