import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AnalyticsSummary } from '../AnalyticsSummary';
import { MS_PER_DAY } from '~/constants/intervals';
import type { TrackedSite, UnblockHistory } from '~/types/storage';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * AnalyticsSummary の表示分岐とコールバックの検査
 *
 * 追跡サイトが 0 件のときの空状態、ブロック中と解除済みで変わる表示、
 * 経過日数の言い回しの切り替わり（今日 / 昨日 / N 日前 / N 週間前 / N か月前）を
 * 境界値で確かめる。再ブロック・追跡停止は取り消しが効くとは限らないため、
 * どのドメインが渡るかまで見る。
 */

// 置換値（経過日数・週数・月数）が描画結果に現れるよう chrome.i18n を差し替える
stubI18nWithSubstitutions();

/** 経過日数の判定が現在時刻に依存するため、基準時刻を固定する */
const NOW = new Date('2026-03-01T12:00:00.000Z');

const isoDaysAgo = (days: number): string =>
  new Date(NOW.getTime() - days * MS_PER_DAY).toISOString();

const siteOf = (overrides: Partial<TrackedSite> = {}): TrackedSite => ({
  domain: 'example.com',
  status: 'blocked',
  blockedAt: isoDaysAgo(0),
  unblockedAt: null,
  timeAfterUnblock: 0,
  lastActivity: null,
  ...overrides
});

const historyOf = (sites: TrackedSite[]): UnblockHistory => ({
  sites: Object.fromEntries(sites.map((site) => [site.domain, site]))
});

function renderSummary(sites: TrackedSite[]) {
  const onReblock = vi.fn();
  const onStopTracking = vi.fn();
  const result = render(
    <AnalyticsSummary
      unblockHistory={historyOf(sites)}
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

  describe('ブロック中のサイト', () => {
    it('ブロック中の表示にし、操作ボタンと浪費時間は出さない', () => {
      renderSummary([siteOf({ status: 'blocked', timeAfterUnblock: 600 })]);

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
      renderSummary([
        siteOf({ status: 'blocked', unblockedAt: isoDaysAgo(1) })
      ]);

      expect(screen.queryByText(/^unblockedOn:/)).not.toBeInTheDocument();
    });
  });

  describe('解除済みのサイト', () => {
    it('解除済みの表示にし、浪費時間と操作ボタンを出す', () => {
      renderSummary([
        siteOf({
          status: 'unblocked',
          unblockedAt: isoDaysAgo(1),
          timeAfterUnblock: 3660
        })
      ]);

      expect(screen.getByText('statusUnblocked')).toBeInTheDocument();
      expect(screen.getByText('1h 1m')).toBeInTheDocument();
      expect(
        screen.getByTestId('analytics-reblock-button')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('analytics-stop-tracking-button')
      ).toBeInTheDocument();
    });

    it('浪費時間が 0 秒でも表示する', () => {
      renderSummary([
        siteOf({ status: 'unblocked', unblockedAt: null, timeAfterUnblock: 0 })
      ]);

      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    it('解除日が未記録なら解除日の行を出さない', () => {
      renderSummary([siteOf({ status: 'unblocked', unblockedAt: null })]);

      expect(screen.queryByText(/^unblockedOn:/)).not.toBeInTheDocument();
    });

    it('解除日が記録されていれば相対表記で出す', () => {
      renderSummary([
        siteOf({ status: 'unblocked', unblockedAt: isoDaysAgo(1) })
      ]);

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
    it('解除済みが 2 件以上なら合計を出す', () => {
      renderSummary([
        siteOf({
          domain: 'a.example',
          status: 'unblocked',
          timeAfterUnblock: 600
        }),
        siteOf({
          domain: 'b.example',
          status: 'unblocked',
          timeAfterUnblock: 1200
        })
      ]);

      expect(screen.getByText('totalWastedTime')).toBeInTheDocument();
      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('解除済みが 1 件なら合計は出さない', () => {
      renderSummary([
        siteOf({
          domain: 'a.example',
          status: 'unblocked',
          timeAfterUnblock: 600
        }),
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
