import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { YouTubeSection } from '../YouTubeSection';
import { selectYouTubeSection } from '~/lib/siteSelectors';
import type { UnblockRequest } from '~/hooks/useUnblockGuard';
import type { YouTubeSectionValue } from '~/lib/siteSelectors';

// youtube.com が無いときの節の値（すべて OFF）
const YOUTUBE_OFF = selectYouTubeSection({});

/**
 * YouTubeSection の表示分岐とコールバックの検査
 *
 * 過去の不具合（machina-gg/vision-focus#422）は YouTube の非表示設定が
 * 効かないもので、親へ返す設定オブジェクトの中身が要点になる。
 * ここでは「どのトグルを押すと、どのキーが何に変わって返るか」まで確かめる。
 *
 * chrome.i18n はテスト環境に無く、getMessage はキー名をそのまま返す
 * （src/lib/i18n.ts）。文言の検査はキー名で行う。
 */

/**
 * 見出しの文言から、それに対応するトグルを引く
 *
 * 各トグルには data-testid が無いため、見出しの要素から祖先をたどり
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

function renderSection(
  youtube: Partial<YouTubeSectionValue> = {},
  onYouTubeChange = vi.fn()
) {
  const settings: YouTubeSectionValue = { ...YOUTUBE_OFF, ...youtube };
  const onRequestUnblock = vi.fn<(request: UnblockRequest) => void>();
  render(
    <YouTubeSection
      youtube={settings}
      onYouTubeChange={onYouTubeChange}
      onRequestUnblock={onRequestUnblock}
    />
  );
  return { settings, onYouTubeChange, onRequestUnblock };
}

/** 確認に回された依頼を 1 件取り出す（呼ばれていなければ失敗させる） */
function onlyRequest(
  onRequestUnblock: ReturnType<typeof renderSection>['onRequestUnblock']
): UnblockRequest {
  expect(onRequestUnblock).toHaveBeenCalledTimes(1);
  return onRequestUnblock.mock.calls[0][0];
}

describe('YouTubeSection', () => {
  describe('無効のとき', () => {
    it('既定の設定では主トグルが OFF で、無効の案内が出る', () => {
      renderSection();

      expect(switchNear('youtubeEnabled')).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(screen.getByText('youtubeDisabledNote')).toBeInTheDocument();
    });

    it('アクセスブロックの設定は表示されない', () => {
      renderSection();

      expect(screen.queryByText('youtubeBlockAccess')).not.toBeInTheDocument();
      expect(screen.queryByText('timeLimitSettings')).not.toBeInTheDocument();
    });

    it('個別機能のトグルは表示されるが操作できない', () => {
      renderSection();

      expect(switchNear('youtubeHideShorts')).toBeDisabled();
      expect(switchNear('youtubeHideRecommendations')).toBeDisabled();
      expect(switchNear('youtubeHideComments')).toBeDisabled();
      expect(switchNear('youtubeHideHomeFeed')).toBeDisabled();
    });

    it('主トグルを押すと確認なしで enabled だけが true になって返る', () => {
      const { settings, onYouTubeChange, onRequestUnblock } = renderSection();

      fireEvent.click(switchNear('youtubeEnabled'));

      expect(onYouTubeChange).toHaveBeenCalledWith({
        ...settings,
        enabled: true
      });
      expect(onRequestUnblock).not.toHaveBeenCalled();
    });
  });

  describe('有効のとき', () => {
    it('無効の案内が消え、アクセスブロックのトグルが出る', () => {
      renderSection({ enabled: true });

      expect(screen.queryByText('youtubeDisabledNote')).not.toBeInTheDocument();
      expect(screen.getByText('youtubeBlockAccess')).toBeInTheDocument();
    });

    it('個別機能のトグルが操作できる', () => {
      renderSection({ enabled: true });

      expect(switchNear('youtubeHideShorts')).toBeEnabled();
    });

    it('個別機能のトグルを押すとそのキーだけが true になって返る', () => {
      const { settings, onYouTubeChange } = renderSection({ enabled: true });

      fireEvent.click(switchNear('youtubeHideShorts'));

      expect(onYouTubeChange).toHaveBeenCalledWith({
        ...settings,
        hideShorts: true
      });
    });

    it('ON の個別機能を押すと確認なしで false になって返る', () => {
      const { settings, onYouTubeChange, onRequestUnblock } = renderSection({
        enabled: true,
        hideComments: true
      });

      expect(switchNear('youtubeHideComments')).toHaveAttribute(
        'aria-checked',
        'true'
      );

      fireEvent.click(switchNear('youtubeHideComments'));

      expect(onYouTubeChange).toHaveBeenCalledWith({
        ...settings,
        hideComments: false
      });
      expect(onRequestUnblock).not.toHaveBeenCalled();
    });

    it('アクセスブロックを押すと確認なしで blockAccess が true になって返る', () => {
      const { settings, onYouTubeChange, onRequestUnblock } = renderSection({
        enabled: true
      });

      fireEvent.click(switchNear('youtubeBlockAccess'));

      expect(onYouTubeChange).toHaveBeenCalledWith({
        ...settings,
        blockAccess: true
      });
      expect(onRequestUnblock).not.toHaveBeenCalled();
    });

    it('アクセスブロックが OFF なら時間制限の設定は出ない', () => {
      renderSection({ enabled: true, blockAccess: false });

      expect(screen.queryByText('timeLimitSettings')).not.toBeInTheDocument();
    });
  });

  // OFF にするとブロックが弱まる 2 つのトグルは、確認が通るまで設定を変えない
  describe('ブロックを弱める操作の確認', () => {
    it('主トグルを OFF にすると確認に回り、まだ設定を変えない', () => {
      const { onYouTubeChange, onRequestUnblock } = renderSection({
        enabled: true
      });

      fireEvent.click(switchNear('youtubeEnabled'));

      const request = onlyRequest(onRequestUnblock);
      expect(request).toMatchObject({
        domain: 'youtube.com',
        timeLimit: null,
        action: 'toggle'
      });
      expect(onYouTubeChange).not.toHaveBeenCalled();
      // 制御コンポーネントなので、確認が通るまで表示も ON のまま
      expect(switchNear('youtubeEnabled')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('主トグルの確認が通ると enabled だけが false になって返る', () => {
      const { settings, onYouTubeChange, onRequestUnblock } = renderSection({
        enabled: true,
        hideShorts: true
      });

      fireEvent.click(switchNear('youtubeEnabled'));
      onlyRequest(onRequestUnblock).onConfirm();

      expect(onYouTubeChange).toHaveBeenCalledWith({
        ...settings,
        enabled: false
      });
    });

    it('アクセスブロックを OFF にすると確認に回り、まだ設定を変えない', () => {
      const { onYouTubeChange, onRequestUnblock } = renderSection({
        enabled: true,
        blockAccess: true
      });

      fireEvent.click(switchNear('youtubeBlockAccess'));

      expect(onlyRequest(onRequestUnblock)).toMatchObject({
        domain: 'youtube.com',
        action: 'toggle'
      });
      expect(onYouTubeChange).not.toHaveBeenCalled();
      expect(switchNear('youtubeBlockAccess')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('アクセスブロックの確認が通ると blockAccess だけが false になって返る', () => {
      const { settings, onYouTubeChange, onRequestUnblock } = renderSection({
        enabled: true,
        blockAccess: true
      });

      fireEvent.click(switchNear('youtubeBlockAccess'));
      onlyRequest(onRequestUnblock).onConfirm();

      expect(onYouTubeChange).toHaveBeenCalledWith({
        ...settings,
        blockAccess: false
      });
    });

    // ブロック方式の表示は時間制限の有無で決まるため、時間制限をそのまま渡す
    it('時間制限があれば依頼にその時間制限が載る', () => {
      const timeLimit = { type: 'daily' as const, limitSeconds: 30 * 60 };
      const { onRequestUnblock } = renderSection({
        enabled: true,
        blockAccess: true,
        timeLimit
      });

      fireEvent.click(switchNear('youtubeBlockAccess'));

      expect(onlyRequest(onRequestUnblock).timeLimit).toEqual(timeLimit);
    });
  });

  describe('時間制限の設定', () => {
    it('アクセスブロックが ON なら時間制限の設定が出る', () => {
      renderSection({ enabled: true, blockAccess: true });

      expect(screen.getByText('timeLimitSettings')).toBeInTheDocument();
      expect(screen.getByText('save')).toBeDisabled();
    });

    it('時間制限が未設定なら現在の設定表示は出ない', () => {
      renderSection({ enabled: true, blockAccess: true });

      expect(screen.queryByText(/currentSetting/)).not.toBeInTheDocument();
    });

    it('時間制限が設定されていれば現在の設定を分数で表示する', () => {
      renderSection({
        enabled: true,
        blockAccess: true,
        timeLimit: { type: 'daily', limitSeconds: 45 * 60 }
      });

      expect(screen.getByText(/currentSetting/)).toHaveTextContent('45');
    });

    it('1 日制限へ変えて保存すると既定の 30 分が秒で返る', () => {
      const { settings, onYouTubeChange } = renderSection({
        enabled: true,
        blockAccess: true
      });

      fireEvent.change(screen.getAllByRole('combobox')[0], {
        target: { value: 'daily' }
      });

      expect(screen.getByText('save')).toBeEnabled();

      fireEvent.click(screen.getByText('save'));

      expect(onYouTubeChange).toHaveBeenCalledWith({
        ...settings,
        timeLimit: { type: 'daily', limitSeconds: 30 * 60 }
      });
      expect(screen.getByText('saved')).toBeInTheDocument();
    });

    it('分数を選び直して保存するとその分数が秒で返る', () => {
      const { settings, onYouTubeChange } = renderSection({
        enabled: true,
        blockAccess: true,
        timeLimit: { type: 'daily', limitSeconds: 30 * 60 }
      });

      fireEvent.change(screen.getAllByRole('combobox')[1], {
        target: { value: '60' }
      });
      fireEvent.click(screen.getByText('save'));

      expect(onYouTubeChange).toHaveBeenCalledWith({
        ...settings,
        timeLimit: { type: 'daily', limitSeconds: 60 * 60 }
      });
    });

    it('常時ブロックへ戻して保存すると timeLimit が null で返る', () => {
      const { settings, onYouTubeChange } = renderSection({
        enabled: true,
        blockAccess: true,
        timeLimit: { type: 'daily', limitSeconds: 30 * 60 }
      });

      fireEvent.change(screen.getAllByRole('combobox')[0], {
        target: { value: 'always' }
      });
      fireEvent.click(screen.getByText('save'));

      expect(onYouTubeChange).toHaveBeenCalledWith({
        ...settings,
        timeLimit: null
      });
    });
  });
});
