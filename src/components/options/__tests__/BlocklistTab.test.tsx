import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { BlocklistTab } from '../BlocklistTab';
import {
  DEFAULT_SETTINGS,
  DEFAULT_UNBLOCK_CONFIRM_SETTINGS
} from '~/types/storage';
import type { AppSettings, BlockItem } from '~/types/storage';
import { stubI18nWithSubstitutions } from '~/test/i18n';

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
  settings: undefined as unknown
}));

vi.mock('~/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: contextState.settings,
    setSettings: vi.fn(),
    vision: undefined,
    setVision: vi.fn()
  })
}));

// 設定に長押し秒数が無ければ既定値で確認が走る
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

const itemOf = (overrides: Partial<BlockItem> = {}): BlockItem => ({
  id: 'item-1',
  domain: 'example.com',
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00Z',
  enabled: true,
  timeLimit: null,
  ...overrides
});

function setSettings(overrides: Partial<AppSettings> | undefined) {
  contextState.settings =
    overrides === undefined ? undefined : { ...DEFAULT_SETTINGS, ...overrides };
}

type TabProps = Parameters<typeof BlocklistTab>[0];

function renderTab(props: Partial<TabProps> = {}) {
  const handlers = {
    setNewDomain: vi.fn(),
    onAddDomain: vi.fn(),
    onRemoveDomain: vi.fn(),
    onToggleDomain: vi.fn(),
    onUpdateTimeLimit: vi.fn(),
    onUpdateNotifications: vi.fn(),
    onYouTubeChange: vi.fn()
  };

  render(
    <BlocklistTab
      newDomain=""
      blockError=""
      youtube={DEFAULT_SETTINGS.youtube}
      {...handlers}
      {...props}
    />
  );

  return handlers;
}

beforeEach(() => {
  setSettings({ blockList: [] });
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
      setSettings({ blockList: [] });

      renderTab();

      expect(screen.getByText('noBlockedSites')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText('loading')).not.toBeInTheDocument();
    });

    it('ブロック対象の件数ぶん項目を表示する', () => {
      setSettings({
        blockList: [
          itemOf({ id: 'a', domain: 'a.example' }),
          itemOf({ id: 'b', domain: 'b.example' })
        ]
      });

      renderTab();

      expect(screen.getAllByTestId('blocklist-item')).toHaveLength(2);
      expect(screen.queryByText('noBlockedSites')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('a.example')).toBeInTheDocument();
    });
  });

  describe('ブロック回数の対応づけ', () => {
    it('ドメイン名が一致する回数をその項目に表示する', () => {
      setSettings({ blockList: [itemOf({ domain: 'example.com' })] });

      renderTab({
        siteBlockCounts: {
          'example.com': { domain: 'example.com', count: 4, lastBlocked: '' }
        }
      });

      expect(screen.getByText('blockedTimesShort(4)')).toBeInTheDocument();
    });

    it('ワイルドカード指定はワイルドカードを外した名前で照合する', () => {
      setSettings({
        blockList: [itemOf({ domain: '*.example.com', isWildcard: true })]
      });

      renderTab({
        siteBlockCounts: {
          'example.com': { domain: 'example.com', count: 7, lastBlocked: '' }
        }
      });

      expect(screen.getByText('blockedTimesShort(7)')).toBeInTheDocument();
    });

    it('照合できる回数が無ければバッジを表示しない', () => {
      setSettings({ blockList: [itemOf({ domain: 'example.com' })] });

      renderTab({
        siteBlockCounts: {
          'other.example': {
            domain: 'other.example',
            count: 9,
            lastBlocked: ''
          }
        }
      });

      expect(screen.queryByText(/^blockedTimesShort/)).not.toBeInTheDocument();
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

  describe('通知設定の表示', () => {
    it('時間制限つきのサイトが無ければ通知設定は出ない', () => {
      setSettings({ blockList: [itemOf({ timeLimit: null })] });

      renderTab();

      expect(
        screen.queryByText('notificationSettings')
      ).not.toBeInTheDocument();
    });

    it('時間制限つきのサイトがあれば通知設定が出る', () => {
      setSettings({
        blockList: [
          itemOf({ timeLimit: { type: 'daily', limitSeconds: 1800 } })
        ]
      });

      renderTab();

      expect(screen.getByText('notificationSettings')).toBeInTheDocument();
    });
  });

  describe('パスワード保護なしの解除', () => {
    beforeEach(() => {
      setSettings({ blockList: [itemOf()] });
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

    it('無効なトグルを入れるときは確認なしで onToggleDomain(id, true) が呼ばれる', () => {
      setSettings({ blockList: [itemOf({ enabled: false })] });

      const handlers = renderTab();

      fireEvent.click(screen.getByTestId('blocklist-item-toggle'));

      expect(handlers.onToggleDomain).toHaveBeenCalledWith('item-1', true);
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
        blockList: [itemOf()],
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
    it('渡した YouTube 設定がそのまま子に反映される', () => {
      renderTab({
        youtube: { ...DEFAULT_SETTINGS.youtube, enabled: true }
      });

      expect(screen.getByText('youtubeBlockAccess')).toBeInTheDocument();
    });
  });

  // YouTube を弱める操作も、ブロックリストと同じ確認の経路を通ることを確かめる
  describe('YouTube のブロックを弱める操作', () => {
    const youtubeOn = {
      ...DEFAULT_SETTINGS.youtube,
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
        youtube: {
          ...youtubeOn,
          timeLimit: { type: 'daily', limitSeconds: 1800 }
        }
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
        ...youtubeOn,
        enabled: false
      });
    });

    it('ON にする操作は確認なしで反映する', () => {
      const handlers = renderTab({
        youtube: { ...youtubeOn, blockAccess: false }
      });

      fireEvent.click(switchNear('youtubeBlockAccess'));

      expect(
        screen.queryByTestId('unblock-confirm-hold-button')
      ).not.toBeInTheDocument();
      expect(handlers.onYouTubeChange).toHaveBeenCalledWith({
        ...youtubeOn,
        blockAccess: true
      });
    });

    it('パスワード保護中はパスワード入力が開き、まだ切らない', () => {
      setSettings({
        blockList: [],
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
        blockList: [],
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
