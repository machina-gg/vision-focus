import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { BlockedSitesList } from '../BlockedSitesList';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';
import type { TrackedSite, TrackedSites } from '~/types/site';

stubI18nWithSubstitutions();

const itemOf = (domain: string, enabled = true): TrackedSite =>
  blockedSite(domain, { enabled });

function expand() {
  fireEvent.click(screen.getByTestId('newtab-blocked-sites-toggle'));
}

function showMoreButton() {
  return screen.queryByTestId('newtab-blocked-sites-show-more');
}

function clickShowMore() {
  fireEvent.click(screen.getByTestId('newtab-blocked-sites-show-more'));
}

function visibleDomains() {
  return screen
    .queryAllByTestId('newtab-blocked-site-domain')
    .map((el) => el.textContent);
}

function itemsOf(n: number): TrackedSites {
  return sitesOf(
    ...Array.from({ length: n }, (_, i) => itemOf(`site${i}.example`))
  );
}

describe('BlockedSitesList', () => {
  describe('表示するサイトが無いとき', () => {
    it('ブロック一覧が空なら何も描画しない', () => {
      const { container } = render(
        <BlockedSitesList trackedSites={{}} blockCounts={{}} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('すべて無効なら何も描画しない', () => {
      const { container } = render(
        <BlockedSitesList
          trackedSites={sitesOf(
            itemOf('a.example', false),
            itemOf('b.example', false)
          )}
          blockCounts={{}}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('並べるサイト', () => {
    it('追跡だけのサイトと youtube.com は並べない（youtube.com は YouTube の節が担当する）', () => {
      render(
        <BlockedSitesList
          trackedSites={sitesOf(
            itemOf('a.example'),
            trackedSite('tracked.example'),
            itemOf(YOUTUBE_DOMAIN)
          )}
          blockCounts={{}}
        />
      );

      expand();

      expect(visibleDomains()).toEqual(['a.example']);
    });
  });

  describe('見出しの件数', () => {
    it('有効なサイトだけを数える', () => {
      render(
        <BlockedSitesList
          trackedSites={sitesOf(
            itemOf('a.example'),
            itemOf('b.example', false),
            itemOf('c.example')
          )}
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
        <BlockedSitesList
          trackedSites={sitesOf(itemOf('a.example'))}
          blockCounts={{}}
        />
      );

      expect(
        screen.queryByTestId('newtab-blocked-site-domain')
      ).not.toBeInTheDocument();
    });

    it('開閉ボタンが未展開であることを属性で示す', () => {
      render(
        <BlockedSitesList
          trackedSites={sitesOf(itemOf('a.example'))}
          blockCounts={{}}
        />
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
          trackedSites={sitesOf(
            itemOf('a.example'),
            itemOf('hidden.example', false)
          )}
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
        <BlockedSitesList
          trackedSites={sitesOf(itemOf('a.example'))}
          blockCounts={{}}
        />
      );

      expand();

      expect(screen.getByTestId('newtab-blocked-sites-toggle')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });

    it('もう一度押すと閉じる', () => {
      render(
        <BlockedSitesList
          trackedSites={sitesOf(itemOf('a.example'))}
          blockCounts={{}}
        />
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
          trackedSites={itemsOf(7)}
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
          trackedSites={sitesOf(itemOf('a.example'))}
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
          trackedSites={itemsOf(7)}
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
          trackedSites={itemsOf(7)}
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
          trackedSites={itemsOf(7)}
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
          trackedSites={itemsOf(5)}
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
          trackedSites={itemsOf(7)}
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
          trackedSites={sitesOf(itemOf('a.example'))}
          blockCounts={{ 'a.example': 3 }}
        />
      );

      expand();

      expect(screen.getByText('blockedTimesShort(3)')).toBeInTheDocument();
    });

    it('0 回なら回数を出さない', () => {
      render(
        <BlockedSitesList
          trackedSites={sitesOf(itemOf('a.example'))}
          blockCounts={{ 'a.example': 0 }}
        />
      );

      expand();

      expect(screen.queryByText(/^blockedTimesShort/)).not.toBeInTheDocument();
    });

    it('記録が無いドメインでも例外にならず、回数を出さない', () => {
      render(
        <BlockedSitesList
          trackedSites={sitesOf(itemOf('a.example'))}
          blockCounts={{}}
        />
      );

      expand();

      expect(screen.getByText('a.example')).toBeInTheDocument();
      expect(screen.queryByText(/^blockedTimesShort/)).not.toBeInTheDocument();
    });
  });
});
