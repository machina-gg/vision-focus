import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SiteRankingList } from '../SiteRankingList';
import type { AnalyticsData } from '~/types/analytics';
import { DEFAULT_ANALYTICS } from '~/types/analytics';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * SiteRankingList の並び替え・件数の上限・解除回数の出し分けの検査
 *
 * 集計が空のときにセクションごと消えること（見出しだけが残らないこと）と、
 * ブロック回数の多い順に 10 件までであることを見る。
 * 解除回数は 0 のとき出さない分岐があるため、境界として 0 と 1 を含める。
 */

// ブロック回数が文言の置換値として表示に出るため、置換値の見える stub を使う
stubI18nWithSubstitutions();

const analyticsOf = (
  blockCounts: Record<string, number>,
  unblockCounts: Record<string, number> = {}
): AnalyticsData => ({
  ...DEFAULT_ANALYTICS,
  siteBlockCounts: Object.fromEntries(
    Object.entries(blockCounts).map(([domain, count]) => [
      domain,
      { domain, count, lastBlocked: '2026-03-01T00:00:00.000Z' }
    ])
  ),
  siteUnblockCounts: Object.fromEntries(
    Object.entries(unblockCounts).map(([domain, count]) => [
      domain,
      { domain, count, lastUnblocked: '2026-03-01T00:00:00.000Z' }
    ])
  )
});

/** textContent 上での出現位置（並び順の確認に使う） */
const positionOf = (container: HTMLElement, text: string) =>
  (container.textContent ?? '').indexOf(text);

describe('SiteRankingList', () => {
  describe('集計が無いとき', () => {
    it('ブロック回数が 0 件ならセクションごと描画しない', () => {
      const { container } = render(
        <SiteRankingList analyticsData={analyticsOf({})} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('siteBlockCounts が未設定でも例外にならず、何も描画しない', () => {
      const { container } = render(
        <SiteRankingList
          analyticsData={
            {
              ...DEFAULT_ANALYTICS,
              siteBlockCounts: undefined
            } as unknown as AnalyticsData
          }
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('並び順と件数', () => {
    it('ブロック回数の多い順に並べる', () => {
      const { container } = render(
        <SiteRankingList
          analyticsData={analyticsOf({
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
        <SiteRankingList
          analyticsData={analyticsOf({ 'a.example': 3, 'b.example': 2 })}
        />
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

      render(<SiteRankingList analyticsData={analyticsOf(counts)} />);

      expect(screen.getByText('site-9.example')).toBeInTheDocument();
      expect(screen.queryByText('site-10.example')).not.toBeInTheDocument();
      expect(screen.queryByText('site-11.example')).not.toBeInTheDocument();
    });

    it('ブロック回数を文言の置換値として出す', () => {
      render(
        <SiteRankingList analyticsData={analyticsOf({ 'a.example': 7 })} />
      );

      expect(screen.getByText('blockedTimesShort(7)')).toBeInTheDocument();
    });
  });

  describe('解除回数', () => {
    it('解除の記録が無いサイトには解除回数を出さない', () => {
      render(
        <SiteRankingList analyticsData={analyticsOf({ 'a.example': 3 })} />
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('解除回数が 0 のときも出さない', () => {
      render(
        <SiteRankingList
          analyticsData={analyticsOf({ 'a.example': 3 }, { 'a.example': 0 })}
        />
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('解除回数が 1 以上のときはその数を出す', () => {
      render(
        <SiteRankingList
          analyticsData={analyticsOf({ 'a.example': 3 }, { 'a.example': 4 })}
        />
      );

      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });
});
