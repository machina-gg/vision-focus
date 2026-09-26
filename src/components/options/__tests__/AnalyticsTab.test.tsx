import React from 'react';

import { act, render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AnalyticsTab } from '../AnalyticsTab';
import type { ActivityLog } from '~/types/activity';
import type { TrackedSites } from '~/types/site';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';

/**
 * AnalyticsTab の「計測するサイトを足す」入力の検査
 *
 * ドメインは前後の空白と大文字小文字の揺れが混ざりやすく、揃えずに
 * 保存すると同じサイトが二重に並ぶ。ここでは渡る文字列そのものと、
 * 空白だけの入力で追加させないこと、拒否されたときに理由を出して入力を残すことを見る。
 *
 * 一覧・集計・書き出しは子コンポーネントの責務なので、受け取った値を
 * そのまま渡しているかだけを見る（実体は chrome.storage を読みに行く）。
 */

/** 子が受け取った事実と母集団を「日付|サイト」の形で読めるようにする */
interface SourcesProps {
  activity: ActivityLog;
  sites: readonly string[];
}
const sourcesText = ({ activity, sites }: SourcesProps) =>
  `${Object.keys(activity).join(',')}|${sites.join(',')}`;

/** 追跡中のサイトをそのまま受ける子（書き出し・一覧）の受け取った値 */
interface TrackedSitesProps {
  activity: ActivityLog;
  trackedSites: TrackedSites;
}
const trackedSitesText = ({ activity, trackedSites }: TrackedSitesProps) =>
  sourcesText({ activity, sites: Object.keys(trackedSites) });

vi.mock('../analytics', () => ({
  AnalyticsExportBar: (props: TrackedSitesProps) => (
    <div data-testid="export-bar">{trackedSitesText(props)}</div>
  ),
  SiteRankingList: (props: SourcesProps) => (
    <div data-testid="site-ranking">{sourcesText(props)}</div>
  ),
  AnalyticsSummary: (props: TrackedSitesProps) => (
    <div data-testid="summary">{trackedSitesText(props)}</div>
  ),
  AnalyticsDateFilter: (
    props: SourcesProps & {
      isSupportPromptVisible: boolean;
      onSupport: () => Promise<void>;
      onDismissSupport: () => Promise<void>;
    }
  ) => (
    <div data-testid="date-filter">
      {sourcesText(props)}
      <span data-testid="date-filter-support-visible">
        {String(props.isSupportPromptVisible)}
      </span>
      <button
        data-testid="date-filter-support"
        onClick={() => void props.onSupport()}
      >
        支援する
      </button>
      <button
        data-testid="date-filter-dismiss-support"
        onClick={() => void props.onDismissSupport()}
      >
        支援の案内を閉じる
      </button>
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
    onAddSite: vi.fn(async (_domain: string) => true),
    onSupport: vi.fn(async () => undefined),
    onDismissSupport: vi.fn(async () => undefined)
  };

  render(
    <AnalyticsTab
      activity={{}}
      trackedSites={{}}
      addSiteError=""
      isSupportPromptVisible={false}
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

    it('追加すると入力欄が空に戻り、続けて押せなくなる', async () => {
      const { input, button } = renderTab();

      type(input, 'example.com');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(input).toHaveValue('');
      expect(button).toBeDisabled();
    });
  });

  // 入れ子・重複・形式の誤りは background が拒否し、理由は親から addSiteError で届く
  describe('追加を拒否されたとき', () => {
    it('入力欄を空にしない（理由を読んで直せるように）', async () => {
      const { input, button } = renderTab({
        onAddSite: vi.fn(async (_domain: string) => false)
      });

      type(input, 'm.example.com');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(input).toHaveValue('m.example.com');
    });

    it('拒否の理由を表示する', () => {
      renderTab({
        addSiteError:
          'm.example.com は追跡中の example.com に含まれるため追加できません'
      });

      expect(screen.getByTestId('analytics-add-site-error')).toHaveTextContent(
        'm.example.com は追跡中の example.com に含まれるため追加できません'
      );
    });

    it('理由が空なら何も表示しない', () => {
      renderTab();

      expect(
        screen.queryByTestId('analytics-add-site-error')
      ).not.toBeInTheDocument();
    });
  });

  describe('子コンポーネントへの受け渡し', () => {
    it('同じ事実と母集団を 4 つの子すべてへ渡す', () => {
      renderTab({
        activity: {
          '2026-03-10': {
            'a.example': { seconds: 60, blocks: 1, unblocks: 0 }
          }
        },
        trackedSites: sitesOf(
          trackedSite('a.example'),
          blockedSite('b.example')
        )
      });

      const expected = '2026-03-10|a.example,b.example';
      expect(screen.getByTestId('export-bar')).toHaveTextContent(expected);
      expect(screen.getByTestId('site-ranking')).toHaveTextContent(expected);
      expect(screen.getByTestId('summary')).toHaveTextContent(expected);
      expect(screen.getByTestId('date-filter')).toHaveTextContent(expected);
    });

    it('支援の案内を出すかどうかを期間の絞り込みへ渡す', () => {
      renderTab({ isSupportPromptVisible: true });

      expect(
        screen.getByTestId('date-filter-support-visible')
      ).toHaveTextContent('true');
    });

    it('支援と閉じるの操作を親へそのまま返す', () => {
      const { onSupport, onDismissSupport } = renderTab();

      fireEvent.click(screen.getByTestId('date-filter-support'));
      fireEvent.click(screen.getByTestId('date-filter-dismiss-support'));

      expect(onSupport).toHaveBeenCalledTimes(1);
      expect(onDismissSupport).toHaveBeenCalledTimes(1);
    });
  });
});
