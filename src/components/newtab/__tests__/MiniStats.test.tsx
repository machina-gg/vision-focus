import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { MiniStats } from '../MiniStats';
import { stubI18nWithSubstitutions } from '~/test/i18n';

stubI18nWithSubstitutions();

describe('MiniStats', () => {
  describe('今日のブロック数', () => {
    it('0 件でも 0 と出す', () => {
      render(<MiniStats blockCount={0} blockingDays={null} />);

      expect(screen.getByTestId('newtab-block-count')).toHaveTextContent('0');
    });

    it('渡した件数をそのまま出す', () => {
      render(<MiniStats blockCount={42} blockingDays={null} />);

      expect(screen.getByTestId('newtab-block-count')).toHaveTextContent('42');
    });
  });

  describe('ブロック日数が null のとき', () => {
    it('日数の欄ごと出さない', () => {
      render(<MiniStats blockCount={3} blockingDays={null} />);

      expect(
        screen.queryByTestId('newtab-blocking-days')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('blockingDays')).not.toBeInTheDocument();
    });
  });

  describe('ブロック日数があるとき', () => {
    it('0 日でも欄を出し、0 を渡す', () => {
      render(<MiniStats blockCount={3} blockingDays={0} />);

      expect(screen.getByTestId('newtab-blocking-days')).toHaveTextContent(
        'blockedForDays(0)'
      );
    });

    it('渡した日数を文言の置換値に入れる', () => {
      render(<MiniStats blockCount={3} blockingDays={12} />);

      expect(screen.getByTestId('newtab-blocking-days')).toHaveTextContent(
        'blockedForDays(12)'
      );
    });
  });

  describe('分析へのリンク', () => {
    it('onAnalyticsClick を渡さないときはボタンを出さない', () => {
      render(<MiniStats blockCount={0} blockingDays={null} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('渡したときはボタンを出し、押すと呼ばれる', () => {
      const onAnalyticsClick = vi.fn();
      render(
        <MiniStats
          blockCount={0}
          blockingDays={null}
          onAnalyticsClick={onAnalyticsClick}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'viewAnalytics' }));

      expect(onAnalyticsClick).toHaveBeenCalledTimes(1);
    });
  });
});
