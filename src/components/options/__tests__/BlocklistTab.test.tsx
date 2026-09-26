import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { BlocklistTab } from '../BlocklistTab';
import {
  DEFAULT_SETTINGS,
  DEFAULT_UNBLOCK_CONFIRM_SETTINGS
} from '~/types/storage';
import type { AppSettings } from '~/types/storage';
import type { ActivityLog } from '~/types/activity';
import type { YouTubeSettingsInput } from '~/types/messageSchemas';
import type { TimeLimit } from '~/types/storage';
import type { TrackedSite } from '~/types/site';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import { toDateKey } from '~/lib/time';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';

/**
 * BlocklistTab の表示分岐とコールバックの検査
 *
 * ブロック解除は「パスワード保護の有無」で経路が分かれ、どちらでも
 * 確認を経ずに解除してはいけない。ここでは確認前にコールバックが
 * 呼ばれないことまで確かめる。
 *
 * 一覧は「未取得」「0 件」「1 件以上」の 3 状態を取る。未取得と 0 件が
 * 同じ表示になると登録済みのサイトが消えたように見えるため、別の表示に
 * なることまで検査する（machina-gg/vision-focus#446）。
 *
 * 設定は SettingsContext から来るため、Context ごと差し替える
 * （実体は chrome.storage を読みに行き、テストから値を決められない）。
 */

// 置換値（解除確認のドメイン名）が描画結果に現れるよう chrome.i18n を差し替える
stubI18nWithSubstitutions();

const contextState = vi.hoisted(() => ({
  settings: undefined as unknown,
  // 追跡中のサイトは props で渡る
  sites: [] as unknown[]
}));

vi.mock('~/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: contextState.settings,
    setSettings: vi.fn(),
    vision: undefined,
    setVision: vi.fn()
  })
}));

// setSettings が DEFAULT_SETTINGS を土台にするため、確認は既定の秒数で走る
const DEFAULT_HOLD_MS = DEFAULT_UNBLOCK_CONFIRM_SETTINGS.holdSeconds * 1000;

/**
 * 見出しの文言から、それに対応するトグルを引く
 *
 * YouTube のトグルには data-testid が無いため、見出しの要素から祖先をたどり
 * 最初に見つかったトグルを返す（見出しに最も近いものが対応するトグル）。
 */
function switchNear(text: string): HTMLElement {
  let node: HTMLElement | null = screen.getByText(text);
  while (node) {
    const found = node.querySelector('[role="switch"]');
    if (found) return found as HTMLElement;
    node = node.parentElement;
  }
  throw new Error(`${text} に対応するトグルが見つからない`);
}

/** ブロック設定を持つサイト（既定は example.com の有効な常時ブロック） */
const itemOf = (
  overrides: { domain?: string; enabled?: boolean; timeLimit?: TimeLimit } = {}
): TrackedSite => {
  const { domain = 'example.com', ...block } = overrides;
  return blockedSite(domain, block);
};

const YOUTUBE_OFF: YouTubeSettingsInput = {
  enabled: false,
  blockAccess: false,
  hideShorts: false,
  hideRecommendations: false,
  hideComments: false,
  hideHomeFeed: false,
  timeLimit: null
};

/** 全体の設定（Context）と追跡中のサイト（props）を用意する。undefined は設定が未取得 */
function setSettings(
  overrides: (Partial<AppSettings> & { sites?: TrackedSite[] }) | undefined
) {
  if (overrides === undefined) {
    contextState.settings = undefined;
    contextState.sites = [];
    return;
  }
  const { sites = [], ...rest } = overrides;
  contextState.settings = { ...DEFAULT_SETTINGS, ...rest };
  contextState.sites = sites;
}

type TabProps = Parameters<typeof BlocklistTab>[0];

/** `youtube` は youtube.com のサイト（追跡中のサイトに足して渡す） */
function renderTab({
  youtube,
  ...props
}: Partial<TabProps> & { youtube?: TrackedSite } = {}) {
  const sites = contextState.sites as TrackedSite[];
  const handlers = {
    setNewDomain: vi.fn(),
    onAddDomain: vi.fn(),
    onRemoveDomain: vi.fn(),
    onToggleDomain: vi.fn(),
    onUpdateTimeLimit: vi.fn(),
    onYouTubeChange: vi.fn()
  };

  render(
    <BlocklistTab
      newDomain=""
      blockError=""
      activity={{}}
      trackedSites={sitesOf(...sites, ...(youtube ? [youtube] : []))}
      {...handlers}
      {...props}
    />
  );

  return handlers;
}

beforeEach(() => {
  setSettings({ sites: [] });
});

describe('BlocklistTab', () => {
  describe('ブロック一覧の表示', () => {
    it('設定が未取得なら読み込み中であることを表示する', () => {
      setSettings(undefined);

      renderTab();

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('loading')).toBeInTheDocument();
      expect(screen.getByText('addSiteToBlock')).toBeInTheDocument();
      expect(screen.queryAllByTestId('blocklist-item')).toHaveLength(0);
    });

    // 未取得のまま未登録の案内を出すと、登録済みのサイトが消えたように見える
    it('設定が未取得なら未登録の案内は表示しない', () => {
      setSettings(undefined);

      renderTab();

      expect(screen.queryByText('noBlockedSites')).not.toBeInTheDocument();
    });

    it('ブロック対象が 0 件なら未登録の案内を表示し、読み込み中は表示しない', () => {
      setSettings({ sites: [] });

      renderTab();

      expect(screen.getByText('noBlockedSites')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText('loading')).not.toBeInTheDocument();
    });

    it('ブロック対象の件数ぶん項目を表示する', () => {
      setSettings({
        sites: [
          itemOf({ domain: 'a.example' }),
          itemOf({ domain: 'b.example' })
        ]
      });

      renderTab();

      expect(screen.getAllByTestId('blocklist-item')).toHaveLength(2);
      expect(screen.queryByText('noBlockedSites')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('a.example')).toBeInTheDocument();
    });
  });

  describe('事実の表（activity）からの導出', () => {
    /** 日付 × サイトの行を作る（既定は今日のローカル日付） */
    function logOf(
      rows: Record<string, { seconds?: number; blocks?: number }>,
      date: Date = new Date()
    ): ActivityLog {
      return {
        [toDateKey(date)]: Object.fromEntries(
          Object.entries(rows).map(([site, row]) => [
            site,
            { seconds: row.seconds ?? 0, blocks: row.blocks ?? 0, unblocks: 0 }
          ])
        )
      };
    }

    it('ブロック回数は保持期間全体の合計をその項目に表示する', () => {
      setSettings({ sites: [itemOf({ domain: 'example.com' })] });
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      renderTab({
        activity: {
          ...logOf({ 'example.com': { blocks: 3 } }),
          ...logOf({ 'example.com': { blocks: 1 } }, lastWeek)
        }
      });

      expect(screen.getByText('blockedTimesShort(4)')).toBeInTheDocument();
    });

    it('照合できる回数が無ければバッジを表示しない', () => {
      setSettings({ sites: [itemOf({ domain: 'example.com' })] });

      renderTab({ activity: logOf({ 'other.example': { blocks: 9 } }) });

      expect(screen.queryByText(/^blockedTimesShort/)).not.toBeInTheDocument();
    });

    it('時間制限の残り時間は今日の表示秒数から出す', () => {
      setSettings({
        sites: [
          itemOf({
            domain: 'example.com',
            timeLimit: { type: 'daily', limitSeconds: 60 }
          })
        ]
      });

      renderTab({ activity: logOf({ 'example.com': { seconds: 60 } }) });

      expect(screen.getByTestId('time-limit-badge')).toHaveAttribute(
        'data-state',
        'exceeded'
      );
    });

    it('前日の表示秒数は残り時間に数えない', () => {
      setSettings({
        sites: [itemOf({ timeLimit: { type: 'daily', limitSeconds: 60 } })]
      });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      renderTab({
        activity: logOf({ 'example.com': { seconds: 600 } }, yesterday)
      });

      expect(screen.getByTestId('time-limit-badge')).toHaveAttribute(
        'data-state',
        'remaining'
      );
    });
  });

  describe('ドメインの追加', () => {
    it('入力値が入力欄に反映される', () => {
      renderTab({ newDomain: 'typed.example' });

      expect(screen.getByTestId('blocklist-domain-input')).toHaveValue(
        'typed.example'
      );
    });

    it('入力すると setNewDomain が入力値とともに呼ばれる', () => {
      const handlers = renderTab();

      fireEvent.change(screen.getByTestId('blocklist-domain-input'), {
        target: { value: 'new.example' }
      });

      expect(handlers.setNewDomain).toHaveBeenCalledWith('new.example');
    });

    it('追加ボタンで onAddDomain が呼ばれる', () => {
      const handlers = renderTab();

      fireEvent.click(screen.getByTestId('blocklist-add-button'));

      expect(handlers.onAddDomain).toHaveBeenCalledTimes(1);
    });

    it('エラーが空文字なら何も表示しない', () => {
      renderTab({ blockError: '' });

      expect(screen.queryByText('不正なドメイン')).not.toBeInTheDocument();
    });

    it('エラーがあればその文言を表示する', () => {
      renderTab({ blockError: '不正なドメイン' });

      expect(screen.getByText('不正なドメイン')).toBeInTheDocument();
    });
  });

  describe('通知設定', () => {
    it('時間制限つきのサイトがあっても通知設定は出さない（設定タブの担当）', () => {
      setSettings({
        sites: [itemOf({ timeLimit: { type: 'daily', limitSeconds: 1800 } })]
      });

      renderTab();

      expect(
        screen.queryByText('notificationSettings')
      ).not.toBeInTheDocument();
    });
  });

  describe('パスワード保護なしの解除', () => {
    beforeEach(() => {
      setSettings({ sites: [itemOf()] });
    });

    it('パスワード保護の表示は出ない', () => {
      renderTab();

      expect(
        screen.queryByText('passwordProtectionActive')
      ).not.toBeInTheDocument();
    });

    it('削除ボタンでは確認モーダルが開くだけで、まだ削除しない', () => {
      const handlers = renderTab();

      fireEvent.click(screen.getByTestId('blocklist-item-remove'));

      expect(
        screen.getByTestId('unblock-confirm-hold-button')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/deleteBlockConfirmDescription/)
      ).toHaveTextContent('example.com');
      expect(handlers.onRemoveDomain).not.toHaveBeenCalled();
    });

    it('有効なトグルを切るときは確認モーダルが開くだけで、まだ切らない', () => {
      const handlers = renderTab();

      fireEvent.click(screen.getByTestId('blocklist-item-toggle'));

      expect(
        screen.getByTestId('unblock-confirm-hold-button')
      ).toBeInTheDocument();
      expect(screen.getByText(/unblockConfirmDescription/)).toBeInTheDocument();
      expect(handlers.onToggleDomain).not.toHaveBeenCalled();
    });

    it('無効なトグルを入れるときは確認なしで onToggleDomain(サイトキー, true) が呼ばれる', () => {
      setSettings({ sites: [itemOf({ enabled: false })] });

      const handlers = renderTab();

      fireEvent.click(screen.getByTestId('blocklist-item-toggle'));

      expect(handlers.onToggleDomain).toHaveBeenCalledWith('example.com', true);
      expect(
        screen.queryByTestId('unblock-confirm-hold-button')
      ).not.toBeInTheDocument();
    });

    it('確認モーダルを閉じても解除はされない', () => {
      const handlers = renderTab();

      fireEvent.click(screen.getByTestId('blocklist-item-remove'));
      fireEvent.click(screen.getByTestId('unblock-confirm-cancel'));

      expect(
        screen.queryByTestId('unblock-confirm-hold-button')
      ).not.toBeInTheDocument();
      expect(handlers.onRemoveDomain).not.toHaveBeenCalled();
    });
  });

  describe('パスワード保護ありの解除', () => {
    beforeEach(() => {
      setSettings({
        sites: [itemOf()],
        password: { enabled: true, passwordHash: 'hash' }
      });
    });

    it('パスワード保護中であることを表示する', () => {
      renderTab();

      expect(screen.getByText('passwordProtectionActive')).toBeInTheDocument();
    });

    it('削除ボタンではパスワード入力が開き、まだ削除しない', () => {
      const handlers = renderTab();

      fireEvent.click(screen.getByTestId('blocklist-item-remove'));

      expect(screen.getByTestId('password-modal-confirm')).toBeInTheDocument();
      expect(
        screen.queryByTestId('unblock-confirm-hold-button')
      ).not.toBeInTheDocument();
      expect(handlers.onRemoveDomain).not.toHaveBeenCalled();
    });

    it('有効なトグルを切るときもパスワード入力が開き、まだ切らない', () => {
      const handlers = renderTab();

      fireEvent.click(screen.getByTestId('blocklist-item-toggle'));

      expect(screen.getByTestId('password-modal-confirm')).toBeInTheDocument();
      expect(handlers.onToggleDomain).not.toHaveBeenCalled();
    });

    it('パスワード入力を閉じても解除はされない', () => {
      const handlers = renderTab();

      fireEvent.click(screen.getByTestId('blocklist-item-remove'));
      fireEvent.click(screen.getByTestId('password-modal-cancel'));

      expect(handlers.onRemoveDomain).not.toHaveBeenCalled();
    });
  });

  // YouTube の操作そのものは YouTubeSection のテストが担う。
  // ここでは props が子まで届くことだけを確かめる
  describe('YouTube 設定の受け渡し', () => {
    it('youtube.com のサイトが子に渡る', () => {
      renderTab({
        youtube: trackedSite(YOUTUBE_DOMAIN, { youtube: youtubeFeatures() })
      });

      expect(screen.getByText('youtubeBlockAccess')).toBeInTheDocument();
    });

    // youtube.com の設定は YouTube の節だけが担当する（一覧にも出すと 2 箇所から変えられる）
    it('ブロック設定を持つ youtube.com は「ブロック中のサイト」一覧に出さない', () => {
      setSettings({ sites: [itemOf({ domain: 'a.example' })] });

      renderTab({ youtube: blockedSite(YOUTUBE_DOMAIN) });

      expect(
        screen
          .getAllByTestId('blocklist-item-domain')
          .map((el) => el.textContent)
      ).toEqual(['a.example']);
    });

    it('youtube.com だけなら一覧は未登録の案内になる', () => {
      renderTab({ youtube: blockedSite(YOUTUBE_DOMAIN) });

      expect(screen.getByText('noBlockedSites')).toBeInTheDocument();
    });
  });

  // YouTube を弱める操作も、ブロックリストと同じ確認の経路を通ることを確かめる
  describe('YouTube のブロックを弱める操作', () => {
    // YouTube 機能とアクセスブロック（有効）を持つ youtube.com と、そのとき節が送る値
    const youtubeOn = blockedSite(
      YOUTUBE_DOMAIN,
      {},
      { youtube: youtubeFeatures() }
    );
    const youtubeOnValue: YouTubeSettingsInput = {
      ...YOUTUBE_OFF,
      enabled: true,
      blockAccess: true
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    it('主トグルを OFF にすると youtube.com の長押し確認が開き、まだ切らない', () => {
      const handlers = renderTab({ youtube: youtubeOn });

      fireEvent.click(switchNear('youtubeEnabled'));

      expect(
        screen.getByTestId('unblock-confirm-hold-button')
      ).toBeInTheDocument();
      expect(screen.getByText(/unblockConfirmDescription/)).toHaveTextContent(
        'youtube.com'
      );
      expect(screen.getByText(/unblockConfirmBlockStyle/)).toHaveTextContent(
        'alwaysBlocked'
      );
      expect(handlers.onYouTubeChange).not.toHaveBeenCalled();
    });

    it('時間制限があればブロック方式を 1 日の上限と表示する', () => {
      renderTab({
        youtube: blockedSite(
          YOUTUBE_DOMAIN,
          { timeLimit: { type: 'daily', limitSeconds: 1800 } },
          { youtube: youtubeFeatures() }
        )
      });

      fireEvent.click(switchNear('youtubeBlockAccess'));

      expect(screen.getByText(/unblockConfirmBlockStyle/)).toHaveTextContent(
        'dailyLimit'
      );
    });

    it('確認をキャンセルするとトグルは ON のまま残り、設定は変わらない', () => {
      const handlers = renderTab({ youtube: youtubeOn });

      fireEvent.click(switchNear('youtubeBlockAccess'));
      fireEvent.click(screen.getByTestId('unblock-confirm-cancel'));

      expect(
        screen.queryByTestId('unblock-confirm-hold-button')
      ).not.toBeInTheDocument();
      expect(switchNear('youtubeBlockAccess')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(handlers.onYouTubeChange).not.toHaveBeenCalled();
    });

    it('長押しを最後まで続けると enabled だけが false になって返る', () => {
      vi.useFakeTimers();
      const handlers = renderTab({ youtube: youtubeOn });

      fireEvent.click(switchNear('youtubeEnabled'));
      fireEvent.pointerDown(screen.getByTestId('unblock-confirm-hold-button'));
      act(() => {
        vi.advanceTimersByTime(DEFAULT_HOLD_MS + 100);
      });

      expect(handlers.onYouTubeChange).toHaveBeenCalledTimes(1);
      expect(handlers.onYouTubeChange).toHaveBeenCalledWith({
        ...youtubeOnValue,
        enabled: false
      });
    });

    it('ON にする操作は確認なしで反映する', () => {
      const handlers = renderTab({
        youtube: trackedSite(YOUTUBE_DOMAIN, { youtube: youtubeFeatures() })
      });

      fireEvent.click(switchNear('youtubeBlockAccess'));

      expect(
        screen.queryByTestId('unblock-confirm-hold-button')
      ).not.toBeInTheDocument();
      expect(handlers.onYouTubeChange).toHaveBeenCalledWith({
        ...youtubeOnValue,
        blockAccess: true
      });
    });

    it('パスワード保護中はパスワード入力が開き、まだ切らない', () => {
      setSettings({
        sites: [],
        password: { enabled: true, passwordHash: 'hash' }
      });
      const handlers = renderTab({ youtube: youtubeOn });

      fireEvent.click(switchNear('youtubeEnabled'));

      expect(screen.getByTestId('password-modal-confirm')).toBeInTheDocument();
      expect(
        screen.queryByTestId('unblock-confirm-hold-button')
      ).not.toBeInTheDocument();
      expect(handlers.onYouTubeChange).not.toHaveBeenCalled();
    });

    it('パスワード入力を閉じるとトグルは ON のまま残る', () => {
      setSettings({
        sites: [],
        password: { enabled: true, passwordHash: 'hash' }
      });
      const handlers = renderTab({ youtube: youtubeOn });

      fireEvent.click(switchNear('youtubeEnabled'));
      fireEvent.click(screen.getByTestId('password-modal-cancel'));

      expect(switchNear('youtubeEnabled')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(handlers.onYouTubeChange).not.toHaveBeenCalled();
    });
  });
});
