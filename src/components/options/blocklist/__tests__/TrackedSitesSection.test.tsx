import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { TrackedSitesSection } from '../TrackedSitesSection';
import type { TrackedSiteListRow } from '~/lib/siteSelectors';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * TrackedSitesSection の件数集計と並び順の検査
 *
 * 追跡が 0 件のときにセクションごと消えること（見出しだけが残らないこと）と、
 * ブロック中が解除中より先に来ること、同じ状態の中では最近ブロックした順に
 * 並ぶことを見る。並びは textContent 上の位置で確かめ、段組みのクラス名は見ない。
 */

// 追跡件数が文言の置換値として表示に出るため、置換値の見える stub を使う
stubI18nWithSubstitutions();

const rowOf = (
  domain: string,
  isBlocked: boolean,
  blockedAt: string | null = null
): TrackedSiteListRow => ({
  domain,
  isBlocked,
  blockedAt,
  canReblock: blockedAt === null,
  canStopTracking: blockedAt === null
});

/** textContent 上での出現位置（並び順の確認に使う） */
const positionOf = (container: HTMLElement, text: string) =>
  (container.textContent ?? '').indexOf(text);

describe('TrackedSitesSection', () => {
  it('追跡が無ければセクションごと描画しない', () => {
    const { container } = render(<TrackedSitesSection rows={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  describe('件数', () => {
    it('追跡中の総数と、ブロック中・解除中の内訳を出す', () => {
      render(
        <TrackedSitesSection
          rows={[
            rowOf('a.example', true, '2026-03-01T00:00:00.000Z'),
            rowOf('b.example', true, '2026-03-02T00:00:00.000Z'),
            rowOf('c.example', false)
          ]}
        />
      );

      expect(screen.getByText('trackedSitesCount(3)')).toBeInTheDocument();
      expect(screen.getByText('statusBlocked: 2')).toBeInTheDocument();
      expect(screen.getByText('statusUnblocked: 1')).toBeInTheDocument();
    });
  });

  describe('並び順', () => {
    it('ブロック中を解除中より先に並べる', () => {
      const { container } = render(
        <TrackedSitesSection
          rows={[
            rowOf('unblocked.example', false),
            rowOf('blocked.example', true, '2026-03-01T00:00:00.000Z')
          ]}
        />
      );

      expect(positionOf(container, 'blocked.example')).toBeLessThan(
        positionOf(container, 'unblocked.example')
      );
    });

    it('同じ状態の中では最近ブロックしたものを先に並べる', () => {
      const { container } = render(
        <TrackedSitesSection
          rows={[
            rowOf('old.example', true, '2026-03-01T00:00:00.000Z'),
            rowOf('new.example', true, '2026-03-05T00:00:00.000Z')
          ]}
        />
      );

      expect(positionOf(container, 'new.example')).toBeLessThan(
        positionOf(container, 'old.example')
      );
    });
  });

  it('サイトごとに状態のラベルを出す', () => {
    render(
      <TrackedSitesSection
        rows={[
          rowOf('a.example', true, '2026-03-01T00:00:00.000Z'),
          rowOf('b.example', false)
        ]}
      />
    );

    expect(screen.getAllByText('statusBlocked')).toHaveLength(1);
    expect(screen.getAllByText('statusUnblocked')).toHaveLength(1);
    expect(screen.getByText('a.example')).toBeInTheDocument();
    expect(screen.getByText('b.example')).toBeInTheDocument();
  });
});
