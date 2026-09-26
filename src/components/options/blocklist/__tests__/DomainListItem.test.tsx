import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DomainListItem } from '../DomainListItem';
import type { BlockListRow } from '~/lib/siteSelectors';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * DomainListItem の表示分岐とコールバックの検査
 *
 * ブロック回数バッジ（0 件のときは出さない）と、子の TimeLimitEditor から
 * 上がってくる更新に item.id が添えられることを確かめる。
 */

// 置換値（ブロック回数）が描画結果に現れるよう chrome.i18n を差し替える
stubI18nWithSubstitutions();

const baseItem: BlockListRow = {
  id: 'item-1',
  domain: 'example.com',
  createdAt: '2026-01-01T00:00:00Z',
  enabled: true,
  timeLimit: null
};

function renderItem(overrides: {
  item?: Partial<BlockListRow>;
  blockCount?: number;
  usedSeconds?: number;
  onToggle?: (id: string, enabled: boolean) => void;
  onRemove?: (id: string) => void;
  onUpdateTimeLimit?: Parameters<typeof DomainListItem>[0]['onUpdateTimeLimit'];
}) {
  return render(
    <DomainListItem
      item={{ ...baseItem, ...overrides.item }}
      blockCount={overrides.blockCount ?? 0}
      usedSeconds={overrides.usedSeconds ?? 0}
      onToggle={overrides.onToggle ?? vi.fn()}
      onRemove={overrides.onRemove ?? vi.fn()}
      onUpdateTimeLimit={overrides.onUpdateTimeLimit ?? vi.fn()}
    />
  );
}

describe('DomainListItem', () => {
  describe('ドメインの表示', () => {
    it('ドメイン名を表示する', () => {
      renderItem({});

      expect(screen.getByTestId('blocklist-item-domain')).toHaveTextContent(
        'example.com'
      );
    });
  });

  describe('ブロック回数バッジ', () => {
    it('0 件なら表示しない', () => {
      renderItem({ blockCount: 0 });

      expect(screen.queryByText(/^blockedTimesShort/)).not.toBeInTheDocument();
    });

    it('1 件以上なら件数つきで表示する', () => {
      renderItem({ blockCount: 3 });

      expect(screen.getByText('blockedTimesShort(3)')).toBeInTheDocument();
    });
  });

  describe('操作', () => {
    it('有効なトグルを押すと onToggle(id, false) が呼ばれる', () => {
      const onToggle = vi.fn();
      renderItem({ item: { enabled: true }, onToggle });

      fireEvent.click(screen.getByTestId('blocklist-item-toggle'));

      expect(onToggle).toHaveBeenCalledWith('item-1', false);
    });

    it('無効なトグルを押すと onToggle(id, true) が呼ばれる', () => {
      const onToggle = vi.fn();
      renderItem({ item: { enabled: false }, onToggle });

      expect(screen.getByTestId('blocklist-item-toggle')).toHaveAttribute(
        'aria-checked',
        'false'
      );

      fireEvent.click(screen.getByTestId('blocklist-item-toggle'));

      expect(onToggle).toHaveBeenCalledWith('item-1', true);
    });

    it('削除ボタンを押すと onRemove(id) が呼ばれる', () => {
      const onRemove = vi.fn();
      renderItem({ onRemove });

      fireEvent.click(screen.getByTestId('blocklist-item-remove'));

      expect(onRemove).toHaveBeenCalledWith('item-1');
    });
  });

  describe('時間制限の更新', () => {
    it('子の編集結果に item.id を添えて onUpdateTimeLimit が呼ばれる', async () => {
      const onUpdateTimeLimit = vi.fn();
      renderItem({ onUpdateTimeLimit });

      // 時間制限エディタを開き、1 日あたりの制限に切り替えて保存する
      fireEvent.click(screen.getByText('alwaysBlocked'));
      fireEvent.change(screen.getAllByRole('combobox')[0], {
        target: { value: 'daily' }
      });
      // 保存は非同期（onUpdate の await 後に保存済み表示へ状態が変わる）
      await act(async () => {
        fireEvent.click(screen.getByText('save'));
      });

      expect(onUpdateTimeLimit).toHaveBeenCalledWith('item-1', {
        type: 'daily',
        limitSeconds: 30 * 60
      });
    });
  });
});
