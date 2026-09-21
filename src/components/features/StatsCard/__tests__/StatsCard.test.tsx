import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { StatsCard } from '../StatsCard';

/**
 * StatsCard が受け取った値をそのまま出すかの検査
 *
 * 集計が無い期間では value に空文字や 0 表記が渡る。欄ごと消えたり
 * 例外になったりしないことを見る。
 *
 * type（waste / invest / block / neutral）の違いは配色のクラス名にしか
 * 出ないため検査しない。
 */

describe('StatsCard', () => {
  describe('受け取った値の表示', () => {
    it('ラベルと値をそのまま出す', () => {
      render(<StatsCard label="無駄にした時間" value="1h 20m" />);

      expect(screen.getByText('無駄にした時間')).toBeInTheDocument();
      expect(screen.getByText('1h 20m')).toBeInTheDocument();
    });

    it('値が 0 でもラベルごと消えない', () => {
      render(<StatsCard label="ブロック数" value="0" />);

      expect(screen.getByText('ブロック数')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('値が空文字でも例外にならず、ラベルは残る', () => {
      expect(() =>
        render(<StatsCard label="ブロック数" value="" />)
      ).not.toThrow();

      expect(screen.getByText('ブロック数')).toBeInTheDocument();
    });

    it('ラベルが空文字でも値は出る', () => {
      render(<StatsCard label="" value="3" />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('アイコン', () => {
    it('渡さないときはアイコンの入れ物を作らない', () => {
      render(<StatsCard label="ブロック数" value="3" />);

      expect(screen.queryByTestId('stats-icon')).not.toBeInTheDocument();
    });

    it('渡したときはそのまま描画する', () => {
      render(
        <StatsCard
          label="ブロック数"
          value="3"
          icon={<span data-testid="stats-icon" />}
        />
      );

      expect(screen.getByTestId('stats-icon')).toBeInTheDocument();
    });
  });

  describe('type を渡したとき', () => {
    it('どの type でもラベルと値は同じように出る', () => {
      // 配色の違いはクラス名にしか出ないため、出る内容が変わらないことだけを見る
      for (const type of ['waste', 'invest', 'block', 'neutral'] as const) {
        const { unmount } = render(
          <StatsCard
            label={`ラベル-${type}`}
            value={`値-${type}`}
            type={type}
          />
        );

        expect(screen.getByText(`ラベル-${type}`)).toBeInTheDocument();
        expect(screen.getByText(`値-${type}`)).toBeInTheDocument();
        unmount();
      }
    });
  });
});
