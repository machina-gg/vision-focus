import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { TrackedSitesSection } from '../TrackedSitesSection';
import type { TrackedSite, UnblockHistory } from '~/types/analytics';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * TrackedSitesSection の件数集計と並び順の検査
 *
 * 追跡が 0 件のときにセクションごと消えること（見出しだけが残らないこと）と、
 * ブロック中が解除済みより先に来ること、同じ状態の中では最後の活動が新しい順に
 * 並ぶことを見る。並びは textContent 上の位置で確かめ、段組みのクラス名は見ない。
 */

// 追跡件数が文言の置換値として表示に出るため、置換値の見える stub を使う
stubI18nWithSubstitutions();

const siteOf = (
  domain: string,
  status: TrackedSite['status'],
  times: { blockedAt: string; lastActivity?: string | null }
): TrackedSite => ({
  domain,
  status,
  blockedAt: times.blockedAt,
  unblockedAt: status === 'unblocked' ? times.blockedAt : null,
  timeAfterUnblock: 0,
  lastActivity: times.lastActivity ?? null
});

const historyOf = (sites: TrackedSite[]): UnblockHistory => ({
  sites: Object.fromEntries(sites.map((site) => [site.domain, site]))
});

/** textContent 上での出現位置（並び順の確認に使う） */
const positionOf = (container: HTMLElement, text: string) =>
  (container.textContent ?? '').indexOf(text);

describe('TrackedSitesSection', () => {
  describe('追跡が無いとき', () => {
    it('セクションごと描画しない', () => {
      const { container } = render(
        <TrackedSitesSection unblockHistory={historyOf([])} />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('件数', () => {
    it('追跡中の総数を見出し脇に出す', () => {
      render(
        <TrackedSitesSection
          unblockHistory={historyOf([
            siteOf('a.example', 'blocked', {
              blockedAt: '2026-03-01T00:00:00.000Z'
            }),
            siteOf('b.example', 'unblocked', {
              blockedAt: '2026-03-02T00:00:00.000Z'
            })
          ])}
        />
      );

      expect(screen.getByText('trackedSitesCount(2)')).toBeInTheDocument();
    });

    it('ブロック中と解除済みをそれぞれ数えて出す', () => {
      render(
        <TrackedSitesSection
          unblockHistory={historyOf([
            siteOf('a.example', 'blocked', {
              blockedAt: '2026-03-01T00:00:00.000Z'
            }),
            siteOf('b.example', 'blocked', {
              blockedAt: '2026-03-02T00:00:00.000Z'
            }),
            siteOf('c.example', 'unblocked', {
              blockedAt: '2026-03-03T00:00:00.000Z'
            })
          ])}
        />
      );

      expect(screen.getByText('statusBlocked: 2')).toBeInTheDocument();
      expect(screen.getByText('statusUnblocked: 1')).toBeInTheDocument();
    });

    it('すべて解除済みならブロック中は 0 と出す', () => {
      render(
        <TrackedSitesSection
          unblockHistory={historyOf([
            siteOf('a.example', 'unblocked', {
              blockedAt: '2026-03-01T00:00:00.000Z'
            })
          ])}
        />
      );

      expect(screen.getByText('statusBlocked: 0')).toBeInTheDocument();
    });
  });

  describe('並び順', () => {
    it('ブロック中を解除済みより先に並べる', () => {
      const { container } = render(
        <TrackedSitesSection
          unblockHistory={historyOf([
            siteOf('unblocked.example', 'unblocked', {
              blockedAt: '2026-03-09T00:00:00.000Z'
            }),
            siteOf('blocked.example', 'blocked', {
              blockedAt: '2026-03-01T00:00:00.000Z'
            })
          ])}
        />
      );

      expect(positionOf(container, 'blocked.example')).toBeLessThan(
        positionOf(container, 'unblocked.example')
      );
    });

    it('同じ状態の中では最後の活動が新しいものを先に並べる', () => {
      const { container } = render(
        <TrackedSitesSection
          unblockHistory={historyOf([
            siteOf('old.example', 'blocked', {
              blockedAt: '2026-01-01T00:00:00.000Z',
              lastActivity: '2026-03-01T00:00:00.000Z'
            }),
            siteOf('new.example', 'blocked', {
              blockedAt: '2026-01-01T00:00:00.000Z',
              lastActivity: '2026-03-09T00:00:00.000Z'
            })
          ])}
        />
      );

      expect(positionOf(container, 'new.example')).toBeLessThan(
        positionOf(container, 'old.example')
      );
    });

    it('最後の活動が無いサイトはブロックした時刻で並べる', () => {
      const { container } = render(
        <TrackedSitesSection
          unblockHistory={historyOf([
            siteOf('older.example', 'blocked', {
              blockedAt: '2026-03-01T00:00:00.000Z'
            }),
            siteOf('newer.example', 'blocked', {
              blockedAt: '2026-03-09T00:00:00.000Z'
            })
          ])}
        />
      );

      expect(positionOf(container, 'newer.example')).toBeLessThan(
        positionOf(container, 'older.example')
      );
    });
  });

  describe('一覧', () => {
    it('サイトごとに状態のラベルを出す', () => {
      render(
        <TrackedSitesSection
          unblockHistory={historyOf([
            siteOf('a.example', 'blocked', {
              blockedAt: '2026-03-01T00:00:00.000Z'
            }),
            siteOf('b.example', 'unblocked', {
              blockedAt: '2026-03-02T00:00:00.000Z'
            })
          ])}
        />
      );

      // サマリー側は「statusBlocked: 1」なので、完全一致するのは一覧のラベルだけ
      expect(screen.getAllByText('statusBlocked')).toHaveLength(1);
      expect(screen.getAllByText('statusUnblocked')).toHaveLength(1);
      expect(screen.getByText('a.example')).toBeInTheDocument();
      expect(screen.getByText('b.example')).toBeInTheDocument();
    });
  });
});
