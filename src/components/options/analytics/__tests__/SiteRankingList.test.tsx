import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SiteRankingList } from '../SiteRankingList';
import { MAX_HISTORY_DAYS_FALLBACK } from '~/constants/intervals';
import { toDateKey } from '~/lib/time';
import type { ActivityLog } from '~/types/activity';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * SiteRankingList の並び替え・件数の上限・解除回数の出し分けの検査
 *
 * 数値は activity のブロック回数・解除回数を、保持期間全体・追跡中のサイトで数えたもの。
 * 集計が空のときにセクションごと消えること（見出しだけが残らないこと）と、
 * ブロック回数の多い順に 10 件までであることを見る。
 * 解除回数は 0 のとき出さない分岐があるため、境界として 0 と 1 を含める。
 */

// ブロック回数が文言の置換値として表示に出るため、置換値の見える stub を使う
stubI18nWithSubstitutions();

/** 今日の行にブロック回数・解除回数を置き、置いたサイトを母集団にする */
const propsOf = (
  blockCounts: Record<string, number>,
  unblockCounts: Record<string, number> = {}
): { activity: ActivityLog; sites: string[] } => {
  const sites = [
    ...new Set([...Object.keys(blockCounts), ...Object.keys(unblockCounts)])
  ];
  return {
    activity: {
      [toDateKey(new Date())]: Object.fromEntries(
        sites.map((site) => [
          site,
          {
            seconds: 0,
            blocks: blockCounts[site] ?? 0,
            unblocks: unblockCounts[site] ?? 0
          }
        ])
      )
    },
    sites
  };
};

/** textContent 上での出現位置（並び順の確認に使う） */
const positionOf = (container: HTMLElement, text: string) =>
  (container.textContent ?? '').indexOf(text);

describe('SiteRankingList', () => {
  describe('集計が無いとき', () => {
    it('ブロック回数が 0 件ならセクションごと描画しない', () => {
      const { container } = render(<SiteRankingList {...propsOf({})} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('母集団の外のサイトは数えない', () => {
      const { activity } = propsOf({ 'untracked.example': 5 });
      const { container } = render(
        <SiteRankingList activity={activity} sites={['a.example']} />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('並び順と件数', () => {
    it('ブロック回数の多い順に並べる', () => {
      const { container } = render(
        <SiteRankingList
          {...propsOf({
            'few.example': 1,
            'many.example': 9,
            'mid.example': 5
          })}
        />
      );

      expect(positionOf(container, 'many.example')).toBeLessThan(
        positionOf(container, 'mid.example')
      );
      expect(positionOf(container, 'mid.example')).toBeLessThan(
        positionOf(container, 'few.example')
      );
    });

    it('順位の番号を 1 から振る', () => {
      render(
        <SiteRankingList {...propsOf({ 'a.example': 3, 'b.example': 2 })} />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('11 件以上あっても上位 10 件までしか出さない', () => {
      const counts = Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [
          `site-${i}.example`,
          12 - i // site-0 が最多
        ])
      );

      render(<SiteRankingList {...propsOf(counts)} />);

      expect(screen.getByText('site-9.example')).toBeInTheDocument();
      expect(screen.queryByText('site-10.example')).not.toBeInTheDocument();
      expect(screen.queryByText('site-11.example')).not.toBeInTheDocument();
    });

    it('保持期間内の日をまたいで足し上げ、保持期間より古い日は数えない', () => {
      const daysAgo = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return toDateKey(d);
      };
      const row = (blocks: number) => ({ seconds: 0, blocks, unblocks: 0 });
      render(
        <SiteRankingList
          activity={{
            [daysAgo(0)]: { 'a.example': row(2) },
            [daysAgo(10)]: { 'a.example': row(3) },
            [daysAgo(MAX_HISTORY_DAYS_FALLBACK + 1)]: { 'a.example': row(100) }
          }}
          sites={['a.example']}
        />
      );

      expect(screen.getByText('blockedTimesShort(5)')).toBeInTheDocument();
    });

    it('ブロック回数を文言の置換値として出す', () => {
      render(<SiteRankingList {...propsOf({ 'a.example': 7 })} />);

      expect(screen.getByText('blockedTimesShort(7)')).toBeInTheDocument();
    });
  });

  describe('解除回数', () => {
    it('解除の記録が無いサイトには解除回数を出さない', () => {
      render(<SiteRankingList {...propsOf({ 'a.example': 3 })} />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('解除回数が 0 のときも出さない', () => {
      render(
        <SiteRankingList {...propsOf({ 'a.example': 3 }, { 'a.example': 0 })} />
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('解除回数が 1 以上のときはその数を出す', () => {
      render(
        <SiteRankingList {...propsOf({ 'a.example': 3 }, { 'a.example': 4 })} />
      );

      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });
});
