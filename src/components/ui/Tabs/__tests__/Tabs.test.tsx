import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Tabs } from '../Tabs';
import type { Tab } from '../Tabs';

/**
 * Tabs の選択状態の出し分けと、押したときに渡る ID の検査
 *
 * 選択中かどうかは aria-selected で出ている（COMPONENT_TESTING.md
 * 「状態は属性で表す」）。装飾の下線・文字色は見ない。
 *
 * タブ 0 件・どのタブにも一致しない activeTab は、タブを増減させる画面で
 * 実際に通る経路なので境界として含める。
 */

const TABS: Tab[] = [
  { id: 'blocklist', label: 'ブロックリスト' },
  { id: 'schedules', label: 'スケジュール' },
  { id: 'help', label: 'ヘルプ' }
];

function renderTabs(
  overrides: Partial<React.ComponentProps<typeof Tabs>> = {}
) {
  const onChange = vi.fn();
  const result = render(
    <Tabs
      tabs={TABS}
      activeTab="blocklist"
      onChange={onChange}
      {...overrides}
    />
  );
  return { ...result, onChange };
}

describe('Tabs', () => {
  describe('表示', () => {
    it('渡したタブのラベルをすべて出す', () => {
      renderTabs();

      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getByRole('tab', { name: 'ヘルプ' })).toBeInTheDocument();
    });

    it('タブが 0 件でも例外にならず、タブ一覧の入れ物だけが残る', () => {
      renderTabs({ tabs: [] });

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
    });

    it('アイコンを渡したタブにはアイコンも出る', () => {
      renderTabs({
        tabs: [
          {
            id: 'blocklist',
            label: 'ブロックリスト',
            icon: <span data-testid="tab-icon" />
          }
        ]
      });

      expect(screen.getByTestId('tab-icon')).toBeInTheDocument();
    });
  });

  describe('選択状態', () => {
    it('activeTab と一致するタブだけが選択中になる', () => {
      renderTabs({ activeTab: 'schedules' });

      expect(screen.getByRole('tab', { name: 'スケジュール' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(
        screen.getByRole('tab', { name: 'ブロックリスト' })
      ).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('tab', { name: 'ヘルプ' })).toHaveAttribute(
        'aria-selected',
        'false'
      );
    });

    it('どのタブにも一致しない activeTab では、どれも選択中にならない', () => {
      renderTabs({ activeTab: 'unknown' });

      for (const tab of screen.getAllByRole('tab')) {
        expect(tab).toHaveAttribute('aria-selected', 'false');
      }
    });
  });

  describe('操作', () => {
    it('押したタブの ID で onChange が呼ばれる', () => {
      const { onChange } = renderTabs();

      fireEvent.click(screen.getByRole('tab', { name: 'ヘルプ' }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('help');
    });

    it('選択中のタブを押しても同じ ID で onChange が呼ばれる', () => {
      const { onChange } = renderTabs({ activeTab: 'help' });

      fireEvent.click(screen.getByRole('tab', { name: 'ヘルプ' }));

      expect(onChange).toHaveBeenCalledWith('help');
    });
  });
});
