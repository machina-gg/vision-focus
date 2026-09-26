import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { RankedList } from '../RankedList';

const itemsOf = (entries: [string, number][]) =>
  entries.map(([domain, value]) => ({ domain, value }));

function renderList(
  items: { domain: string; value: number }[],
  valueType: 'time' | 'count' = 'count'
) {
  return render(
    <RankedList
      items={items}
      valueType={valueType}
      bgColor="bg-gray-50"
      textColor="text-gray-800"
    />
  );
}

describe('RankedList', () => {
  describe('0 件のとき', () => {
    it('データ無しの案内だけを出す', () => {
      renderList([]);

      expect(screen.getByText('noData')).toBeInTheDocument();
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  describe('件数', () => {
    it('3 件までは全部出す', () => {
      renderList(
        itemsOf([
          ['a.example', 1],
          ['b.example', 2],
          ['c.example', 3]
        ])
      );

      expect(screen.getByText('a.example')).toBeInTheDocument();
      expect(screen.getByText('b.example')).toBeInTheDocument();
      expect(screen.getByText('c.example')).toBeInTheDocument();
    });

    it('4 件目以降は出さない', () => {
      renderList(
        itemsOf([
          ['a.example', 1],
          ['b.example', 2],
          ['c.example', 3],
          ['d.example', 4]
        ])
      );

      expect(screen.queryByText('d.example')).not.toBeInTheDocument();
    });

    it('渡された順のまま順位の番号を振る（並べ替えはしない）', () => {
      const { container } = renderList(
        itemsOf([
          ['first.example', 11],
          ['second.example', 99]
        ])
      );

      const text = container.textContent ?? '';
      expect(text.indexOf('first.example')).toBeLessThan(
        text.indexOf('second.example')
      );
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('ドメイン名の表示幅', () => {
    it('固定幅の上限を持たず、行の残り幅いっぱいまで広がる', () => {
      renderList(
        itemsOf([['www.extremely-long-subdomain-name.example.com', 1]])
      );

      const domainEl = screen.getByText(
        'www.extremely-long-subdomain-name.example.com'
      );
      expect(domainEl.className).not.toMatch(/max-w-\[120px\]/);
      expect(domainEl.className).toContain('flex-1');
    });

    it('切れたときに全文が分かるよう title 属性を持つ', () => {
      renderList(
        itemsOf([['www.extremely-long-subdomain-name.example.com', 1]])
      );

      const domainEl = screen.getByText(
        'www.extremely-long-subdomain-name.example.com'
      );
      expect(domainEl).toHaveAttribute(
        'title',
        'www.extremely-long-subdomain-name.example.com'
      );
    });
  });

  describe('値の単位', () => {
    it('回数のときは数値をそのまま出す', () => {
      renderList(itemsOf([['a.example', 90]]), 'count');

      expect(screen.getByText('90')).toBeInTheDocument();
    });

    it('時間のときは秒を読める形に整形して出す', () => {
      renderList(itemsOf([['a.example', 90]]), 'time');

      expect(screen.getByText('1m')).toBeInTheDocument();
      expect(screen.queryByText('90')).not.toBeInTheDocument();
    });

    it('時間が 1 分未満のときは秒で出す', () => {
      renderList(itemsOf([['a.example', 45]]), 'time');

      expect(screen.getByText('45s')).toBeInTheDocument();
    });

    it('時間が 1 時間以上のときは時間と分で出す', () => {
      renderList(itemsOf([['a.example', 3720]]), 'time');

      expect(screen.getByText('1h 2m')).toBeInTheDocument();
    });

    it('値が 0 でも案内文には落ちず、0 として出す', () => {
      renderList(itemsOf([['a.example', 0]]), 'count');

      expect(screen.queryByText('noData')).not.toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
