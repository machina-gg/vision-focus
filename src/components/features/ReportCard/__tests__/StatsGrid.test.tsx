import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { StatsGrid } from '../StatsGrid';

/**
 * StatsGrid の集計値の表示と、変化の向きの検査
 *
 * 前の期間との比較は「無駄時間が減った＝改善」なので、符号の向きと意味が逆になる。
 * 改善か悪化かは色とアイコンにしか出ていなかったため data-change-direction を足し、
 * クラス名ではなくその属性で確かめる（machina-gg/vision-focus#455）。
 */

const renderGrid = (wasteTimeChangePercent: number | null) =>
  render(
    <StatsGrid
      wasteTime={3660}
      blockCount={12}
      unblockCount={3}
      wasteTimeChangePercent={wasteTimeChangePercent}
    />
  );

const changeCell = () => screen.getByTestId('waste-time-change');

describe('StatsGrid', () => {
  describe('集計値の表示', () => {
    it('無駄時間・ブロック数・解除数を出す', () => {
      renderGrid(-12.5);

      expect(screen.getByText('1h 1m')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('変化の向き', () => {
    it('無駄時間が減っていれば改善と示す', () => {
      renderGrid(-12.5);

      expect(changeCell()).toHaveAttribute('data-change-direction', 'improved');
      expect(screen.getByText('-12.5%')).toBeInTheDocument();
    });

    it('無駄時間が増えていれば悪化と示す', () => {
      renderGrid(12.5);

      expect(changeCell()).toHaveAttribute('data-change-direction', 'worsened');
      // 増加側だけ符号を補う
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
    });

    it('変化が 0 なら増減なしと示す', () => {
      renderGrid(0);

      expect(changeCell()).toHaveAttribute(
        'data-change-direction',
        'unchanged'
      );
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('比較する期間が無ければ不明と示す', () => {
      renderGrid(null);

      expect(changeCell()).toHaveAttribute('data-change-direction', 'unknown');
      expect(screen.getByText('noComparisonData')).toBeInTheDocument();
    });

    it.each([
      [-0.04, 'improved', '-0.0%'],
      [0.04, 'worsened', '+0.0%']
    ])(
      '表示が丸めで 0 になる %f でも向きは保つ',
      (value, direction, displayed) => {
        renderGrid(value as number);

        expect(changeCell()).toHaveAttribute(
          'data-change-direction',
          direction as string
        );
        expect(screen.getByText(displayed as string)).toBeInTheDocument();
      }
    );
  });
});
