import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { BlockedSitesList } from '../BlockedSitesList';
import type { BlockItem, SiteBlockCount } from '~/types/storage';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * BlockedSitesList の表示件数と開閉の検査
 *
 * 無効なサイトを除いて 0 件になったら何も描画しないこと、折りたたみ時は
 * 一覧を出さないこと、展開しても maxVisible 件までしか出さないことを確かめる。
 * ブロック回数は 0 回のときに出さない分岐があるため、境界（0 回・未記録）を含める。
 */

// ブロック回数が文言の置換値として表示に出るため、置換値の見える stub を使う
stubI18nWithSubstitutions();

const itemOf = (domain: string, enabled = true): BlockItem => ({
  id: `id-${domain}`,
  domain,
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled
});

const countsOf = (
  counts: Record<string, number>
): Record<string, SiteBlockCount> =>
  Object.fromEntries(
    Object.entries(counts).map(([domain, count]) => [
      domain,
      { domain, count, lastBlocked: '2026-01-01T00:00:00.000Z' }
    ])
  );

/** 開閉ボタンを押して一覧を開く */
function expand() {
  fireEvent.click(screen.getByTestId('newtab-blocked-sites-toggle'));
}

describe('BlockedSitesList', () => {
  describe('表示するサイトが無いとき', () => {
    it('ブロック一覧が空なら何も描画しない', () => {
      const { container } = render(
        <BlockedSitesList blockList={[]} blockCounts={{}} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('すべて無効なら何も描画しない', () => {
      const { container } = render(
        <BlockedSitesList
          blockList={[itemOf('a.example', false), itemOf('b.example', false)]}
          blockCounts={{}}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('見出しの件数', () => {
    it('有効なサイトだけを数える', () => {
      render(
        <BlockedSitesList
          blockList={[
            itemOf('a.example'),
            itemOf('b.example', false),
            itemOf('c.example')
          ]}
          blockCounts={{}}
        />
      );

      expect(
        screen.getByTestId('newtab-blocked-sites-toggle')
      ).toHaveTextContent('blockedSites (2)');
    });
  });

  describe('折りたたんでいるとき', () => {
    it('ドメインの一覧を出さない', () => {
      render(
        <BlockedSitesList blockList={[itemOf('a.example')]} blockCounts={{}} />
      );

      expect(
        screen.queryByTestId('newtab-blocked-site-domain')
      ).not.toBeInTheDocument();
    });
  });

  describe('展開したとき', () => {
    it('有効なサイトのドメインだけを出す', () => {
      render(
        <BlockedSitesList
          blockList={[itemOf('a.example'), itemOf('hidden.example', false)]}
          blockCounts={{}}
        />
      );

      expand();

      const domains = screen
        .getAllByTestId('newtab-blocked-site-domain')
        .map((el) => el.textContent);
      expect(domains).toEqual(['a.example']);
    });

    it('もう一度押すと閉じる', () => {
      render(
        <BlockedSitesList blockList={[itemOf('a.example')]} blockCounts={{}} />
      );

      expand();
      expand();

      expect(
        screen.queryByTestId('newtab-blocked-site-domain')
      ).not.toBeInTheDocument();
    });

    // ⚠ maxVisible が一覧の件数を絞るかは検査しない。
    // 実装では折りたたみ時にだけ slice しており、折りたたみ時は一覧自体を
    // 描画しないため、maxVisible は表示件数に効いていない。
    // 意図した挙動かは PM の判断待ちのため、現在の件数を仕様として固定せず、
    // 「例外にならず一覧が出る」ことだけを確かめる。
    it('件数が maxVisible を超えていても例外にならず一覧を出す', () => {
      render(
        <BlockedSitesList
          blockList={Array.from({ length: 7 }, (_, i) =>
            itemOf(`site${i}.example`)
          )}
          blockCounts={{}}
          maxVisible={2}
        />
      );

      expand();

      expect(
        screen.getAllByTestId('newtab-blocked-site-domain').length
      ).toBeGreaterThan(0);
      expect(screen.getByText('site0.example')).toBeInTheDocument();
    });

    it('maxVisible が 0 でも例外にならない', () => {
      render(
        <BlockedSitesList
          blockList={[itemOf('a.example')]}
          blockCounts={{}}
          maxVisible={0}
        />
      );

      expand();

      expect(
        screen.getByTestId('newtab-blocked-sites-toggle')
      ).toHaveTextContent('blockedSites (1)');
    });
  });

  describe('ブロック回数', () => {
    it('1 回以上なら回数を出す', () => {
      render(
        <BlockedSitesList
          blockList={[itemOf('a.example')]}
          blockCounts={countsOf({ 'a.example': 3 })}
        />
      );

      expand();

      expect(screen.getByText('blockedTimesShort(3)')).toBeInTheDocument();
    });

    it('0 回なら回数を出さない', () => {
      render(
        <BlockedSitesList
          blockList={[itemOf('a.example')]}
          blockCounts={countsOf({ 'a.example': 0 })}
        />
      );

      expand();

      expect(screen.queryByText(/^blockedTimesShort/)).not.toBeInTheDocument();
    });

    it('記録が無いドメインでも例外にならず、回数を出さない', () => {
      render(
        <BlockedSitesList blockList={[itemOf('a.example')]} blockCounts={{}} />
      );

      expand();

      expect(screen.getByText('a.example')).toBeInTheDocument();
      expect(screen.queryByText(/^blockedTimesShort/)).not.toBeInTheDocument();
    });
  });
});
