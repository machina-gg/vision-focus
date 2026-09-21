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
 * 一覧を出さないこと、展開しても maxVisible 件までしか出さず、超える分は
 * 「もっと見る」で開くことを確かめる（machina-gg/vision-focus#457）。
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

/** 開閉ボタンを押して一覧を開く（もう一度押すと閉じる） */
function expand() {
  fireEvent.click(screen.getByTestId('newtab-blocked-sites-toggle'));
}

/** 「もっと見る」ボタン（上限を超える分が無ければ描画されない） */
function showMoreButton() {
  return screen.queryByTestId('newtab-blocked-sites-show-more');
}

/** 「もっと見る」を押して上限を外す（もう一度押すと上限に戻る） */
function clickShowMore() {
  fireEvent.click(screen.getByTestId('newtab-blocked-sites-show-more'));
}

/** 今表示されているドメインの一覧 */
function visibleDomains() {
  return screen
    .queryAllByTestId('newtab-blocked-site-domain')
    .map((el) => el.textContent);
}

/** domain が site0..siteN-1 の有効なブロック項目を n 件作る */
function itemsOf(n: number): BlockItem[] {
  return Array.from({ length: n }, (_, i) => itemOf(`site${i}.example`));
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

    it('開閉ボタンが未展開であることを属性で示す', () => {
      render(
        <BlockedSitesList blockList={[itemOf('a.example')]} blockCounts={{}} />
      );

      expect(screen.getByTestId('newtab-blocked-sites-toggle')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
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

    it('開閉ボタンが展開中であることを属性で示す', () => {
      render(
        <BlockedSitesList blockList={[itemOf('a.example')]} blockCounts={{}} />
      );

      expand();

      expect(screen.getByTestId('newtab-blocked-sites-toggle')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
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

    it('件数が maxVisible を超えていても maxVisible 件までしか並べない', () => {
      render(
        <BlockedSitesList
          blockList={itemsOf(7)}
          blockCounts={{}}
          maxVisible={2}
        />
      );

      expand();

      expect(visibleDomains()).toEqual(['site0.example', 'site1.example']);
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

  describe('「もっと見る」', () => {
    it('maxVisible を超える分が残っているなら、残りの件数を添えて出す', () => {
      render(
        <BlockedSitesList
          blockList={itemsOf(7)}
          blockCounts={{}}
          maxVisible={2}
        />
      );

      expand();

      expect(showMoreButton()).toHaveTextContent('showMoreBlockedSites(5)');
      expect(showMoreButton()).toHaveAttribute('aria-expanded', 'false');
    });

    it('押すと残りが出る', () => {
      render(
        <BlockedSitesList
          blockList={itemsOf(7)}
          blockCounts={{}}
          maxVisible={2}
        />
      );

      expand();
      clickShowMore();

      expect(visibleDomains()).toHaveLength(7);
      expect(screen.getByText('site6.example')).toBeInTheDocument();
      expect(showMoreButton()).toHaveAttribute('aria-expanded', 'true');
      expect(showMoreButton()).toHaveTextContent('showLessBlockedSites');
    });

    it('残りを出したあとにもう一度押すと上限に戻る', () => {
      render(
        <BlockedSitesList
          blockList={itemsOf(7)}
          blockCounts={{}}
          maxVisible={2}
        />
      );

      expand();
      clickShowMore();
      clickShowMore();

      expect(visibleDomains()).toEqual(['site0.example', 'site1.example']);
      expect(showMoreButton()).toHaveAttribute('aria-expanded', 'false');
    });

    it('件数が maxVisible 以下なら出さない', () => {
      render(
        <BlockedSitesList
          blockList={itemsOf(5)}
          blockCounts={{}}
          maxVisible={5}
        />
      );

      expand();

      expect(visibleDomains()).toHaveLength(5);
      expect(showMoreButton()).not.toBeInTheDocument();
    });

    it('一覧を畳んで開き直すと上限が効いた状態に戻る', () => {
      render(
        <BlockedSitesList
          blockList={itemsOf(7)}
          blockCounts={{}}
          maxVisible={2}
        />
      );

      expand();
      clickShowMore();
      expand(); // 畳む
      expand(); // 開き直す

      expect(visibleDomains()).toEqual(['site0.example', 'site1.example']);
      expect(showMoreButton()).toHaveAttribute('aria-expanded', 'false');
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
