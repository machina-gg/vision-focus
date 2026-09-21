import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { TimeLimitBadge } from '../TimeLimitBadge';
import { TIME_LIMIT_CONFIG } from '~/constants/limits';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * TimeLimitBadge の状態ごとの表示の検査
 *
 * 超過・残りわずか・通常の 3 状態を、残り時間と上限の境界値で確かめる。
 * 状態は data-state と文言のキー（timeLimitReached / timeLimitWarning /
 * timeLimitRemaining）で区別できるため、色のクラス名は見ない。
 *
 * ⚠ compact のときだけは、残りわずかかどうかが背景色でしか表現されていないため
 * 検査していない（machina-gg/vision-focus#455）。
 */

// 残り時間の表記が文言に入るため、置換値の見える chrome.i18n を差し込む
stubI18nWithSubstitutions();

/** 警告に入る境界の比率（0.2 = 残り 20% 以下） */
const THRESHOLD = TIME_LIMIT_CONFIG.WARNING_THRESHOLD;

describe('TimeLimitBadge', () => {
  describe('残り時間が尽きたとき', () => {
    it.each([0, -1, -3600])('残り %i 秒なら超過の表示にする', (remaining) => {
      render(
        <TimeLimitBadge remainingSeconds={remaining} limitSeconds={600} />
      );

      const badge = screen.getByTestId('time-limit-badge');
      expect(badge).toHaveAttribute('data-state', 'exceeded');
      expect(badge).toHaveTextContent('timeLimitReached');
    });

    it('超過の表示では残り時間と 1 日あたりの断りを出さない', () => {
      render(<TimeLimitBadge remainingSeconds={0} limitSeconds={600} />);

      const badge = screen.getByTestId('time-limit-badge');
      expect(badge).not.toHaveTextContent('timeLimitRemaining');
      expect(badge).not.toHaveTextContent('perDay');
    });
  });

  describe('残り時間があるとき', () => {
    it('残り 1 秒なら超過ではなく残り時間の表示にする', () => {
      render(<TimeLimitBadge remainingSeconds={1} limitSeconds={600} />);

      const badge = screen.getByTestId('time-limit-badge');
      expect(badge).toHaveAttribute('data-state', 'remaining');
      expect(badge).not.toHaveTextContent('timeLimitReached');
      // 残り 1 秒は上限 600 秒の 20% を下回るため、文言は警告側になる
      expect(badge).toHaveTextContent('timeLimitWarning(1s)');
    });

    it('残り時間と 1 日あたりの断りを出す', () => {
      render(<TimeLimitBadge remainingSeconds={3660} limitSeconds={7200} />);

      const badge = screen.getByTestId('time-limit-badge');
      expect(badge).toHaveTextContent('timeLimitRemaining(1h 1m)');
      expect(badge).toHaveTextContent('perDay');
    });
  });

  describe('残りわずかの境界', () => {
    it(`残りが上限の ${THRESHOLD * 100}% ちょうどなら警告の文言にする`, () => {
      render(
        <TimeLimitBadge
          remainingSeconds={1000 * THRESHOLD}
          limitSeconds={1000}
        />
      );

      expect(screen.getByTestId('time-limit-badge')).toHaveTextContent(
        'timeLimitWarning(3m)'
      );
    });

    it(`残りが上限の ${THRESHOLD * 100}% を超えていれば通常の文言にする`, () => {
      render(
        <TimeLimitBadge
          remainingSeconds={1000 * THRESHOLD + 1}
          limitSeconds={1000}
        />
      );

      expect(screen.getByTestId('time-limit-badge')).toHaveTextContent(
        'timeLimitRemaining(3m)'
      );
    });

    it('showWarning が偽なら残りわずかでも通常の文言にする', () => {
      render(
        <TimeLimitBadge
          remainingSeconds={60}
          limitSeconds={1000}
          showWarning={false}
        />
      );

      expect(screen.getByTestId('time-limit-badge')).toHaveTextContent(
        'timeLimitRemaining(1m)'
      );
    });

    it('上限が 0 でも例外にならず、通常の文言にする', () => {
      render(<TimeLimitBadge remainingSeconds={10} limitSeconds={0} />);

      expect(screen.getByTestId('time-limit-badge')).toHaveTextContent(
        'timeLimitRemaining(10s)'
      );
    });
  });

  describe('compact のとき', () => {
    it('ローカライズした残り時間を出し、1 日あたりの断りは出さない', () => {
      render(
        <TimeLimitBadge remainingSeconds={600} limitSeconds={7200} compact />
      );

      const badge = screen.getByTestId('time-limit-badge');
      expect(badge).toHaveAttribute('data-state', 'remaining');
      expect(badge).toHaveTextContent('timeLimitRemaining(10 min)');
      expect(badge).not.toHaveTextContent('perDay');
    });

    it('残り時間が尽きていれば compact でも超過の表示にする', () => {
      render(
        <TimeLimitBadge remainingSeconds={0} limitSeconds={7200} compact />
      );

      const badge = screen.getByTestId('time-limit-badge');
      expect(badge).toHaveAttribute('data-state', 'exceeded');
      expect(badge).toHaveTextContent('timeLimitReached');
    });
  });
});
