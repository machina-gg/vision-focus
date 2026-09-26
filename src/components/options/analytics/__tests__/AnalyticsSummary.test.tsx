import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AnalyticsSummary } from '../AnalyticsSummary';
import { toDateKey } from '~/lib/time';
import type { ActivityLog, DailySiteActivity } from '~/types/activity';
import type { TrackedSite } from '~/types/site';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';

/**
 * AnalyticsSummary の表示分岐とコールバックの検査
 *
 * 一覧の行は追跡中のサイトで、状態（ブロック中 / 無効 / 追跡だけ）・ブロック開始日・できる操作は
 * サイトの設定から、解除日と解除後の時間は activity から出る。
 * 追跡サイトが 0 件のときの空状態、状態ごとに変わる表示、
 * 経過日数の言い回しの切り替わり（今日 / 昨日 / N 日前 / N 週間前 / N か月前）を
 * 境界値で確かめる。再ブロック・追跡停止は取り消しが効くとは限らないため、
 * どのサイトが渡るかまで見る。
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
 * 追跡中のサイト 1 つ。`blocked` はブロック設定が有効、`disabled` はブロック設定をトグルで無効にしたもの、
 * `tracking` はブロック設定を持たない（ブロックリストから外した・追跡だけの）サイト
 */
const siteOf = ({
  domain = 'example.com',
  status = 'blocked',
  blockedAt = isoDaysAgo(0)
}: {
  domain?: string;
  status?: 'blocked' | 'disabled' | 'tracking';
  blockedAt?: string;
} = {}): TrackedSite =>
  status === 'tracking'
    ? trackedSite(domain)
    : blockedSite(domain, {
        enabled: status === 'blocked',
        addedAt: blockedAt
      });

const row = (seconds: number, unblocks = 0): DailySiteActivity => ({
  seconds,
  blocks: 0,
  unblocks
});

interface RenderOptions {
  activity?: ActivityLog;
}

function renderSummary(
  sites: TrackedSite[],
  { activity = {} }: RenderOptions = {}
) {
  const onReblock = vi.fn();
  const onStopTracking = vi.fn();
  const result = render(
    <AnalyticsSummary
      activity={activity}
      trackedSites={sitesOf(...sites)}
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
    it('ブロック中 → 無効 → 追跡だけの順に並べる', () => {
      renderSummary([
        siteOf({ domain: 'tracking.example', status: 'tracking' }),
        siteOf({ domain: 'disabled.example', status: 'disabled' }),
        siteOf({ domain: 'blocked.example', status: 'blocked' })
      ]);

      expect(
        screen
          .getAllByTestId('analytics-tracked-site')
          .map((el) => el.getAttribute('data-status'))
      ).toEqual(['blocked', 'disabled', 'tracking']);
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

  // ブロック設定をトグルで無効にしたサイト。ブロックは効いていないが設定（時間制限を含む）は残っている
  describe('無効にしたサイト', () => {
    it('「ブロック中（無効）」の表示にし、ブロック開始日と解除後の時間を出す', () => {
      renderSummary(
        [siteOf({ status: 'disabled', blockedAt: isoDaysAgo(2) })],
        {
          activity: {
            [keyDaysAgo(1)]: { 'example.com': row(60, 1) },
            [keyDaysAgo(0)]: { 'example.com': row(600) }
          }
        }
      );

      expect(screen.getByText('statusBlockDisabled')).toBeInTheDocument();
      expect(screen.getByText('blockedSince: daysAgo(2)')).toBeInTheDocument();
      expect(screen.getByText('unblockedOn: yesterday')).toBeInTheDocument();
      expect(screen.getByText('11m')).toBeInTheDocument();
    });

    it('再ブロックだけを出し、押すとそのサイトが渡る（追跡停止は出さない）', () => {
      const site = siteOf({ domain: 'paused.example', status: 'disabled' });
      const { onReblock } = renderSummary([site]);

      fireEvent.click(screen.getByTestId('analytics-reblock-button'));

      expect(onReblock).toHaveBeenCalledWith(site);
      expect(
        screen.queryByTestId('analytics-stop-tracking-button')
      ).not.toBeInTheDocument();
    });

    it('解除後の時間の合計に数える', () => {
      renderSummary(
        [
          siteOf({ domain: 'a.example', status: 'disabled' }),
          siteOf({ domain: 'b.example', status: 'tracking' })
        ],
        {
          activity: {
            [keyDaysAgo(0)]: {
              'a.example': row(600, 1),
              'b.example': row(1200, 1)
            }
          }
        }
      );

      expect(screen.getByText('totalWastedTime')).toBeInTheDocument();
      expect(screen.getByText('30m')).toBeInTheDocument();
    });
  });

  describe('YouTube 機能を使うサイト', () => {
    it('追跡だけなら再ブロックだけを出す（追跡停止は出さない）', () => {
      renderSummary([
        trackedSite('youtube.com', { youtube: youtubeFeatures() })
      ]);

      expect(
        screen.getByTestId('analytics-reblock-button')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('analytics-stop-tracking-button')
      ).not.toBeInTheDocument();
    });

    it('アクセスブロックを無効にしていても追跡停止は出さない', () => {
      renderSummary([
        blockedSite(
          'youtube.com',
          { enabled: false },
          { youtube: youtubeFeatures() }
        )
      ]);

      expect(screen.getByText('statusBlockDisabled')).toBeInTheDocument();
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

  describe('追跡だけのサイト', () => {
    it('解除済みの表示にし、最後に解除した日から今日までの表示時間と操作ボタンを出す', () => {
      renderSummary([siteOf({ status: 'tracking' })], {
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
      renderSummary([siteOf({ status: 'tracking' })], {
        activity: { [keyDaysAgo(0)]: { 'example.com': row(600) } }
      });

      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    it('解除の記録が無ければ解除日の行を出さない', () => {
      renderSummary([siteOf({ status: 'tracking' })]);

      expect(screen.queryByText(/^unblockedOn:/)).not.toBeInTheDocument();
    });

    it('最後に解除した日を相対表記で出す', () => {
      renderSummary([siteOf({ status: 'tracking' })], {
        activity: {
          [keyDaysAgo(3)]: { 'example.com': row(0, 1) },
          [keyDaysAgo(1)]: { 'example.com': row(0, 1) }
        }
      });

      expect(screen.getByText('unblockedOn: yesterday')).toBeInTheDocument();
    });
  });

  describe('操作', () => {
    it('再ブロックを押すとそのサイトで onReblock が呼ばれる', () => {
      const site = siteOf({ domain: 'wasted.example', status: 'tracking' });
      const { onReblock } = renderSummary([site]);

      fireEvent.click(screen.getByTestId('analytics-reblock-button'));

      expect(onReblock).toHaveBeenCalledWith(site);
    });

    it('追跡停止を押すとそのサイトで onStopTracking が呼ばれる', () => {
      const site = siteOf({ domain: 'wasted.example', status: 'tracking' });
      const { onStopTracking } = renderSummary([site]);

      fireEvent.click(screen.getByTestId('analytics-stop-tracking-button'));

      expect(onStopTracking).toHaveBeenCalledWith(site);
    });
  });

  describe('合計浪費時間', () => {
    const twoUnblocked = [
      siteOf({ domain: 'a.example', status: 'tracking' }),
      siteOf({ domain: 'b.example', status: 'tracking' })
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
        siteOf({ domain: 'a.example', status: 'tracking' }),
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
