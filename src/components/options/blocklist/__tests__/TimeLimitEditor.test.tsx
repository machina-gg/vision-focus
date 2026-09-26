import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { TimeLimitEditor } from '../TimeLimitEditor';
import type { TimeLimit } from '~/types/storage';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import { blockedSite } from '~/test/sites';

stubI18nWithSubstitutions();

function renderEditor(options: {
  timeLimit?: TimeLimit | null;
  enabled?: boolean;
  usedSeconds?: number;
  onUpdate?: (timeLimit: TimeLimit | null) => void;
}) {
  const onUpdate = options.onUpdate ?? vi.fn();
  render(
    <TimeLimitEditor
      site={blockedSite('example.com', {
        enabled: options.enabled ?? true,
        timeLimit: options.timeLimit ?? null
      })}
      onUpdate={onUpdate}
      usedSeconds={options.usedSeconds ?? 0}
    />
  );
  return onUpdate;
}

function expand() {
  fireEvent.click(screen.getByRole('button', { name: /alwaysBlocked|limit/ }));
}

describe('TimeLimitEditor', () => {
  describe('折りたたみ時の表示', () => {
    it('時間制限が未設定なら常時ブロックと表示する', () => {
      renderEditor({ timeLimit: null });

      expect(screen.getByText('alwaysBlocked')).toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('時間制限があれば分数つきで表示する', () => {
      renderEditor({ timeLimit: { type: 'daily', limitSeconds: 3600 } });

      // 分数と単位は同じ span 内の別テキストノードなのでまとめて検査する
      const summary = screen.getByRole('button');
      expect(summary).toHaveTextContent('limitMinutes(60)');
      expect(summary).toHaveTextContent('perDay');
    });
  });

  describe('展開時の表示', () => {
    it('未設定なら種別は常時ブロックで、分数の選択肢は出ない', () => {
      renderEditor({ timeLimit: null });

      expand();

      const selects = screen.getAllByRole('combobox');
      expect(selects).toHaveLength(1);
      expect(selects[0]).toHaveValue('always');
      expect(screen.getByText('save')).toBeDisabled();
    });

    it('保存済みの分数が選択肢の初期値になる', () => {
      renderEditor({ timeLimit: { type: 'daily', limitSeconds: 3600 } });

      expand();

      const selects = screen.getAllByRole('combobox');
      expect(selects[0]).toHaveValue('daily');
      expect(selects[1]).toHaveValue('60');
    });

    it('変更が無いあいだ保存ボタンは押せない', () => {
      renderEditor({ timeLimit: { type: 'daily', limitSeconds: 1800 } });

      expand();

      expect(screen.getByText('save')).toBeDisabled();
    });
  });

  describe('保存', () => {
    it('常時ブロックから 1 日制限へ変えると既定の 30 分で保存される', async () => {
      const onUpdate = renderEditor({ timeLimit: null });

      expand();
      fireEvent.change(screen.getAllByRole('combobox')[0], {
        target: { value: 'daily' }
      });

      expect(screen.getByText('save')).toBeEnabled();

      await act(async () => {
        fireEvent.click(screen.getByText('save'));
      });

      expect(onUpdate).toHaveBeenCalledWith({
        type: 'daily',
        limitSeconds: 30 * 60
      });
      expect(screen.getByText('saved')).toBeInTheDocument();
    });

    it('分数を変えて保存すると選んだ分数が秒で渡る', async () => {
      const onUpdate = renderEditor({
        timeLimit: { type: 'daily', limitSeconds: 1800 }
      });

      expand();
      fireEvent.change(screen.getAllByRole('combobox')[1], {
        target: { value: '15' }
      });

      await act(async () => {
        fireEvent.click(screen.getByText('save'));
      });

      expect(onUpdate).toHaveBeenCalledWith({
        type: 'daily',
        limitSeconds: 15 * 60
      });
    });

    it('常時ブロックへ戻すと null が渡る', async () => {
      const onUpdate = renderEditor({
        timeLimit: { type: 'daily', limitSeconds: 1800 }
      });

      expand();
      fireEvent.change(screen.getAllByRole('combobox')[0], {
        target: { value: 'always' }
      });

      await act(async () => {
        fireEvent.click(screen.getByText('save'));
      });

      expect(onUpdate).toHaveBeenCalledWith(null);
    });
  });

  describe('プリセット外の値のマイグレーション', () => {
    it('プリセットに無い分数は最も近いプリセット値へ自動で丸められる', () => {
      const onUpdate = vi.fn();
      // 7 分はプリセット（5 / 15 / 30 / 60）に無い
      renderEditor({
        timeLimit: { type: 'daily', limitSeconds: 7 * 60 },
        onUpdate
      });

      expect(onUpdate).toHaveBeenCalledWith({
        type: 'daily',
        limitSeconds: 5 * 60
      });
    });

    it('プリセットに載る分数では自動更新しない', () => {
      const onUpdate = vi.fn();
      renderEditor({
        timeLimit: { type: 'daily', limitSeconds: 15 * 60 },
        onUpdate
      });

      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('残り時間バッジ', () => {
    it('有効・時間制限ありのとき残り時間を表示する', () => {
      renderEditor({
        timeLimit: { type: 'daily', limitSeconds: 1800 },
        usedSeconds: 600
      });

      expect(screen.getByTestId('time-limit-badge')).toHaveAttribute(
        'data-state',
        'remaining'
      );
    });

    it('使用量が制限を超えていたら超過として表示する', () => {
      renderEditor({
        timeLimit: { type: 'daily', limitSeconds: 1800 },
        usedSeconds: 2400
      });

      expect(screen.getByTestId('time-limit-badge')).toHaveAttribute(
        'data-state',
        'exceeded'
      );
    });

    it('今日まだ使っていなければ上限までの残り時間を表示する', () => {
      renderEditor({
        timeLimit: { type: 'daily', limitSeconds: 1800 },
        usedSeconds: 0
      });

      expect(screen.getByTestId('time-limit-badge')).toHaveAttribute(
        'data-state',
        'remaining'
      );
    });

    it('ブロックが無効ならバッジを表示しない', () => {
      renderEditor({
        enabled: false,
        timeLimit: { type: 'daily', limitSeconds: 1800 },
        usedSeconds: 600
      });

      expect(screen.queryByTestId('time-limit-badge')).not.toBeInTheDocument();
    });

    it('時間制限が未設定ならバッジを表示しない', () => {
      renderEditor({ timeLimit: null, usedSeconds: 600 });

      expect(screen.queryByTestId('time-limit-badge')).not.toBeInTheDocument();
    });
  });
});
