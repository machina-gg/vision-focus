import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AnalyticsSummary } from '../AnalyticsSummary';
import { toDateKey } from '~/lib/time';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import type { TrackedSiteListRow } from '~/lib/siteSelectors';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * AnalyticsSummary の表示分岐とコールバックの検査
 *
 * 一覧の行は母集団（追跡中のサイト）で、ブロック中かどうか・ブロック開始日・できる操作は
 * 追跡中のサイトの設定から、解除日と解除後の時間は activity から出る。
 * 追跡サイトが 0 件のときの空状態、ブロック中と解除済みで変わる表示、
 * 経過日数の言い回しの切り替わり（今日 / 昨日 / N 日前 / N 週間前 / N か月前）を
 * 境界値で確かめる。再ブロック・追跡停止は取り消しが効くとは限らないため、
 * どのドメインが渡るかまで見る。
 */

// 置換値（経過日数・週数・月数）が描画結果に現れるよう chrome.i18n を差し替える
stubI18nWithSubstitutions();

/** 経過日数の判定が現在時刻に依存するため、基準時刻をローカル時刻で固定する（2026-03-01） */
const NOW = new Date(2026, 2, 1, 12);

const dateDaysAgo = (days: number): Date =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - days, 12);
const isoDaysAgo = (days: number): string => dateDaysAgo(days).toISOString();
const keyDaysAgo = (days: number): string => toDateKey(dateDaysAgo(days));

/**
 * 一覧の 1 行。`blocked` はブロック設定が有効なサイト、`unblocked` はブロック設定を
 * 持たない（ブロックリストから外した・追跡だけの）サイト
 */
const siteOf = ({
  domain = 'example.com',
  status = 'blocked',
  blockedAt = isoDaysAgo(0)
}: {
  domain?: string;
  status?: 'blocked' | 'unblocked';
  blockedAt?: string;
} = {}): TrackedSiteListRow =>
  status === 'blocked'
    ? {
        domain,
        isBlocked: true,
        blockedAt,
        canReblock: false,
        canStopTracking: false
      }
    : {
        domain,
        isBlocked: false,
        blockedAt: null,
        canReblock: true,
        canStopTracking: true
      };

const row = (seconds: number, unblocks = 0): DailySiteActivity => ({
  seconds,
  blocks: 0,
  unblocks
});

interface RenderOptions {
  activity?: ActivityLog;
  /** 母集団。省略時は各行のサイトキー */
  sites?: string[];
}

function renderSummary(
  entries: TrackedSiteListRow[],
  { activity = {}, sites }: RenderOptions = {}
) {
  const onReblock = vi.fn();
  const onStopTracking = vi.fn();
  const result = render(
    <AnalyticsSummary
      activity={activity}
      sites={sites ?? entries.map((e) => e.domain)}
      trackedSiteRows={entries}
      onReblock={onReblock}
      onStopTracking={onStopTracking}
    />
  );
  return { onReblock, onStopTracking, ...result };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AnalyticsSummary', () => {
  describe('追跡サイトが 0 件のとき', () => {
    it('空状態の案内を出し、一覧は出さない', () => {
      renderSummary([]);

      expect(screen.getByText('noTrackedSites')).toBeInTheDocument();
      expect(screen.getByText('noTrackedSitesDescription')).toBeInTheDocument();
      expect(
        screen.queryByTestId('analytics-tracked-sites-heading')
      ).not.toBeInTheDocument();
    });
  });

  describe('一覧の見出し', () => {
    it('件数つきの見出しを出し、空状態は出さない', () => {
      renderSummary([
        siteOf({ domain: 'a.example' }),
        siteOf({ domain: 'b.example' })
      ]);

      expect(
        screen.getByTestId('analytics-tracked-sites-heading')
      ).toHaveTextContent('trackedSitesList (2)');
      expect(screen.queryByText('noTrackedSites')).not.toBeInTheDocument();
    });
  });

  describe('並び順', () => {
    it('ブロック中を先に、解除済みを後に並べる', () => {
      const { container } = renderSummary([
        siteOf({ domain: 'unblocked.example', status: 'unblocked' }),
        siteOf({ domain: 'blocked.example', status: 'blocked' })
      ]);

      const text = container.textContent ?? '';
      expect(text.indexOf('blocked.example')).toBeLessThan(
        text.indexOf('unblocked.example')
      );
    });

    it('同じ状態どうしではブロックした日が新しい方を先に並べる', () => {
      const { container } = renderSummary([
        siteOf({ domain: 'old.example', blockedAt: isoDaysAgo(10) }),
        siteOf({ domain: 'new.example', blockedAt: isoDaysAgo(1) })
      ]);

      const text = container.textContent ?? '';
      expect(text.indexOf('new.example')).toBeLessThan(
        text.indexOf('old.example')
      );
    });
  });

  describe('母集団と行の結び付け', () => {
    it('行の無い追跡中のサイトは解除中として並べ、操作ボタンは出さない', () => {
      renderSummary([], { sites: ['imported.example'] });

      expect(screen.getByText('imported.example')).toBeInTheDocument();
      expect(screen.getByText('statusUnblocked')).toBeInTheDocument();
      expect(
        screen.queryByTestId('analytics-reblock-button')
      ).not.toBeInTheDocument();
    });

    it('無効化したブロック設定を持つサイトは解除中と出し、操作ボタンは出さない', () => {
      renderSummary([
        {
          domain: 'paused.example',
          isBlocked: false,
          blockedAt: isoDaysAgo(2),
          canReblock: false,
          canStopTracking: false
        }
      ]);

      expect(screen.getByText('statusUnblocked')).toBeInTheDocument();
      expect(screen.getByText('blockedSince: daysAgo(2)')).toBeInTheDocument();
      expect(
        screen.queryByTestId('analytics-reblock-button')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('analytics-stop-tracking-button')
      ).not.toBeInTheDocument();
    });

    it('YouTube 機能を使うサイトは再ブロックだけを出す（追跡停止は出さない）', () => {
      renderSummary([
        {
          domain: 'youtube.com',
          isBlocked: false,
          blockedAt: null,
          canReblock: true,
          canStopTracking: false
        }
      ]);

      expect(
        screen.getByTestId('analytics-reblock-button')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('analytics-stop-tracking-button')
      ).not.toBeInTheDocument();
    });
  });

  describe('ブロック中のサイト', () => {
    it('ブロック中の表示にし、操作ボタンと浪費時間は出さない', () => {
      renderSummary([siteOf({ status: 'blocked' })], {
        activity: { [keyDaysAgo(0)]: { 'example.com': row(600, 1) } }
      });

      expect(screen.getByText('statusBlocked')).toBeInTheDocument();
      expect(
        screen.queryByTestId('analytics-reblock-button')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('analytics-stop-tracking-button')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('10m')).not.toBeInTheDocument();
    });

    it('解除日の行は出さない', () => {
      renderSummary([siteOf({ status: 'blocked' })], {
        activity: { [keyDaysAgo(1)]: { 'example.com': row(0, 1) } }
      });

      expect(screen.queryByText(/^unblockedOn:/)).not.toBeInTheDocument();
    });
  });

  describe('解除済みのサイト', () => {
    it('解除済みの表示にし、最後に解除した日から今日までの表示時間と操作ボタンを出す', () => {
      renderSummary([siteOf({ status: 'unblocked' })], {
        activity: {
          // 最後の解除より前の日は数えない
          [keyDaysAgo(5)]: { 'example.com': row(9999, 1) },
          [keyDaysAgo(1)]: { 'example.com': row(60, 1) },
          [keyDaysAgo(0)]: { 'example.com': row(3600) }
        }
      });

      expect(screen.getByText('statusUnblocked')).toBeInTheDocument();
      expect(screen.getByText('1h 1m')).toBeInTheDocument();
      expect(
        screen.getByTestId('analytics-reblock-button')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('analytics-stop-tracking-button')
      ).toBeInTheDocument();
    });

    it('解除の記録が無ければ浪費時間は 0 秒と出す', () => {
      renderSummary([siteOf({ status: 'unblocked' })], {
        activity: { [keyDaysAgo(0)]: { 'example.com': row(600) } }
      });

      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    it('解除の記録が無ければ解除日の行を出さない', () => {
      renderSummary([siteOf({ status: 'unblocked' })]);

      expect(screen.queryByText(/^unblockedOn:/)).not.toBeInTheDocument();
    });

    it('最後に解除した日を相対表記で出す', () => {
      renderSummary([siteOf({ status: 'unblocked' })], {
        activity: {
          [keyDaysAgo(3)]: { 'example.com': row(0, 1) },
          [keyDaysAgo(1)]: { 'example.com': row(0, 1) }
        }
      });

      expect(screen.getByText('unblockedOn: yesterday')).toBeInTheDocument();
    });
  });

  describe('操作', () => {
    it('再ブロックを押すとそのドメインで onReblock が呼ばれる', () => {
      const { onReblock } = renderSummary([
        siteOf({ domain: 'wasted.example', status: 'unblocked' })
      ]);

      fireEvent.click(screen.getByTestId('analytics-reblock-button'));

      expect(onReblock).toHaveBeenCalledWith('wasted.example');
    });

    it('追跡停止を押すとそのドメインで onStopTracking が呼ばれる', () => {
      const { onStopTracking } = renderSummary([
        siteOf({ domain: 'wasted.example', status: 'unblocked' })
      ]);

      fireEvent.click(screen.getByTestId('analytics-stop-tracking-button'));

      expect(onStopTracking).toHaveBeenCalledWith('wasted.example');
    });
  });

  describe('合計浪費時間', () => {
    const twoUnblocked = [
      siteOf({ domain: 'a.example', status: 'unblocked' }),
      siteOf({ domain: 'b.example', status: 'unblocked' })
    ];

    it('解除済みが 2 件以上なら、各行の値の和を合計として出す', () => {
      renderSummary(twoUnblocked, {
        activity: {
          [keyDaysAgo(0)]: {
            'a.example': row(600, 1),
            'b.example': row(1200, 1),
            // 母集団の外は数えない
            'untracked.example': row(9999, 1)
          }
        }
      });

      expect(screen.getByText('totalWastedTime')).toBeInTheDocument();
      expect(screen.getByText('10m')).toBeInTheDocument();
      expect(screen.getByText('20m')).toBeInTheDocument();
      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('解除済みが 1 件なら合計は出さない', () => {
      renderSummary([
        siteOf({ domain: 'a.example', status: 'unblocked' }),
        siteOf({ domain: 'b.example', status: 'blocked' })
      ]);

      expect(screen.queryByText('totalWastedTime')).not.toBeInTheDocument();
    });

    it('解除済みが 0 件なら合計は出さない', () => {
      renderSummary([siteOf({ status: 'blocked' })]);

      expect(screen.queryByText('totalWastedTime')).not.toBeInTheDocument();
    });
  });

  describe('経過日数の言い回し', () => {
    const cases: Array<[number, string]> = [
      [0, 'today'],
      [1, 'yesterday'],
      [6, 'daysAgo(6)'],
      [7, 'weeksAgo(1)'],
      [29, 'weeksAgo(4)'],
      [30, 'monthsAgo(1)'],
      [365, 'monthsAgo(12)']
    ];

    it.each(cases)('%i 日前は %s と表示する', (days, expected) => {
      renderSummary([siteOf({ blockedAt: isoDaysAgo(days) })]);

      expect(screen.getByText(`blockedSince: ${expected}`)).toBeInTheDocument();
    });
  });
});
