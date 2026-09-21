import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AnalyticsTab } from '../AnalyticsTab';
import { DEFAULT_ANALYTICS } from '~/types/analytics';
import { DEFAULT_SETTINGS, DEFAULT_UNBLOCK_HISTORY } from '~/types/storage';

/**
 * AnalyticsTab の「計測するサイトを足す」入力の検査
 *
 * ドメインは前後の空白と大文字小文字の揺れが混ざりやすく、揃えずに
 * 保存すると同じサイトが二重に並ぶ。ここでは渡る文字列そのものと、
 * 空白だけの入力で追加させないことを見る。
 *
 * 一覧・集計・書き出しは子コンポーネントの責務なので、受け取った値を
 * そのまま渡しているかだけを見る（実体は chrome.storage を読みに行く）。
 */

vi.mock('~/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { ...DEFAULT_SETTINGS },
    setSettings: vi.fn(),
    vision: undefined,
    setVision: vi.fn()
  })
}));

vi.mock('../analytics', () => ({
  AnalyticsExportBar: (props: { settings?: { version?: unknown } }) => (
    <div data-testid="export-bar">{String(props.settings !== undefined)}</div>
  ),
  SiteRankingList: (props: { analyticsData: { dailyStats: object } }) => (
    <div data-testid="site-ranking">
      {Object.keys(props.analyticsData.dailyStats).join(',')}
    </div>
  ),
  AnalyticsSummary: (props: { unblockHistory: { sites: object } }) => (
    <div data-testid="summary">
      {Object.keys(props.unblockHistory.sites).join(',')}
    </div>
  ),
  AnalyticsDateFilter: (props: { analyticsData: { dailyStats: object } }) => (
    <div data-testid="date-filter">
      {Object.keys(props.analyticsData.dailyStats).join(',')}
    </div>
  )
}));

type TabProps = Parameters<typeof AnalyticsTab>[0];

function renderTab(props: Partial<TabProps> = {}) {
  const handlers = {
    onReblock: vi.fn(),
    onReset: vi.fn(),
    onStopTracking: vi.fn(),
    onRefresh: vi.fn(async () => undefined),
    onAddSite: vi.fn()
  };

  render(
    <AnalyticsTab
      unblockHistory={DEFAULT_UNBLOCK_HISTORY}
      analyticsData={DEFAULT_ANALYTICS}
      {...handlers}
      {...props}
    />
  );

  return {
    ...handlers,
    ...props,
    input: screen.getByTestId('analytics-add-site-input'),
    button: screen.getByTestId('analytics-add-site-button')
  };
}

const type = (input: HTMLElement, value: string) =>
  fireEvent.change(input, { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnalyticsTab', () => {
  describe('入力が空のとき', () => {
    it('追加ボタンを押せない', () => {
      const { button } = renderTab();

      expect(button).toBeDisabled();
    });
  });

  describe('空白だけを入力したとき', () => {
    it('追加ボタンを押せない', () => {
      const { input, button } = renderTab();

      type(input, '   ');

      expect(button).toBeDisabled();
    });

    it('Enter キーを押しても追加されない', () => {
      const { input, onAddSite } = renderTab();

      type(input, '   ');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onAddSite).not.toHaveBeenCalled();
    });
  });

  describe('ドメインを入力したとき', () => {
    it('追加ボタンが押せるようになる', () => {
      const { input, button } = renderTab();

      type(input, 'example.com');

      expect(button).toBeEnabled();
    });

    it('追加ボタンを押すとそのドメインで onAddSite が呼ばれる', () => {
      const { input, button, onAddSite } = renderTab();

      type(input, 'example.com');
      fireEvent.click(button);

      expect(onAddSite).toHaveBeenCalledWith('example.com');
    });

    it('前後の空白を取り除き、小文字にそろえて渡す', () => {
      const { input, button, onAddSite } = renderTab();

      type(input, '  EXAMPLE.CoM  ');
      fireEvent.click(button);

      expect(onAddSite).toHaveBeenCalledWith('example.com');
    });

    it('Enter キーでも同じドメインで onAddSite が呼ばれる', () => {
      const { input, onAddSite } = renderTab();

      type(input, 'Example.com');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onAddSite).toHaveBeenCalledWith('example.com');
    });

    it('Enter 以外のキーでは追加されない', () => {
      const { input, onAddSite } = renderTab();

      type(input, 'example.com');
      fireEvent.keyDown(input, { key: 'a' });

      expect(onAddSite).not.toHaveBeenCalled();
    });

    it('追加すると入力欄が空に戻り、続けて押せなくなる', () => {
      const { input, button } = renderTab();

      type(input, 'example.com');
      fireEvent.click(button);

      expect(input).toHaveValue('');
      expect(button).toBeDisabled();
    });
  });

  describe('子コンポーネントへの受け渡し', () => {
    it('集計データを一覧と期間の絞り込みの両方へ渡す', () => {
      renderTab({
        analyticsData: {
          ...DEFAULT_ANALYTICS,
          dailyStats: {
            '2026-03-10': {
              date: '2026-03-10',
              wasteTime: 60,
              investTime: 0,
              blockCount: 1,
              unblockCount: 0
            }
          }
        }
      });

      expect(screen.getByTestId('site-ranking')).toHaveTextContent(
        '2026-03-10'
      );
      expect(screen.getByTestId('date-filter')).toHaveTextContent('2026-03-10');
    });

    it('解除履歴を集計の要約へ渡す', () => {
      renderTab({
        unblockHistory: {
          sites: {
            'example.com': {
              domain: 'example.com',
              status: 'unblocked',
              blockedAt: '2026-02-01T00:00:00.000Z',
              unblockedAt: '2026-03-01T00:00:00.000Z',
              timeAfterUnblock: 0,
              lastActivity: null
            }
          }
        }
      });

      expect(screen.getByTestId('summary')).toHaveTextContent('example.com');
    });

    it('設定を書き出しの欄へ渡す', () => {
      renderTab();

      expect(screen.getByTestId('export-bar')).toHaveTextContent('true');
    });
  });
});
