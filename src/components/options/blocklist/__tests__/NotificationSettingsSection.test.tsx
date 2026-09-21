import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { NotificationSettingsSection } from '../NotificationSettingsSection';
import type { NotificationSettings } from '~/types/storage';
import { stubI18nWithSubstitutions } from '~/test/i18n';

/**
 * NotificationSettingsSection の表示条件と保存内容の検査
 *
 * 時間制限つきのサイトが無いときは節ごと出さないこと、設定が未保存のときの
 * 既定値（有効・5 分）、および操作で onUpdate に渡る設定の中身を確かめる。
 * 分数は数値で保存する必要があるため、文字列のまま渡っていないかまで見る。
 */

// 選択肢の分数が文言の置換値として表示に出るため、置換値の見える stub を使う
stubI18nWithSubstitutions();

function renderSection(
  notifications: NotificationSettings | undefined,
  hasTimeLimitSites = true
) {
  const onUpdate = vi.fn();
  const result = render(
    <NotificationSettingsSection
      notifications={notifications}
      onUpdate={onUpdate}
      hasTimeLimitSites={hasTimeLimitSites}
    />
  );
  return { onUpdate, ...result };
}

/** 分数の選択欄（Select が描画する select 要素） */
const minutesSelect = () => screen.getByRole('combobox');

describe('NotificationSettingsSection', () => {
  describe('時間制限つきのサイトが無いとき', () => {
    it('何も描画しない', () => {
      const { container } = renderSection(undefined, false);

      expect(container).toBeEmptyDOMElement();
    });

    it('設定が保存されていても描画しない', () => {
      const { container } = renderSection(
        { timeLimitEnabled: true, timeLimitMinutes: 10 },
        false
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('設定が未保存のとき', () => {
    it('通知を有効、5 分前として表示する', () => {
      renderSection(undefined);

      expect(screen.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(minutesSelect()).toHaveValue('5');
    });

    it('見出しと説明を出す', () => {
      renderSection(undefined);

      expect(screen.getByText('notificationSettings')).toBeInTheDocument();
      expect(
        screen.getByText('notificationTimeLimitEnabled')
      ).toBeInTheDocument();
      expect(
        screen.getByText('notificationTimeLimitEnabledDescription')
      ).toBeInTheDocument();
    });
  });

  describe('保存済みの設定があるとき', () => {
    it('保存された分数を選択済みにする', () => {
      renderSection({ timeLimitEnabled: true, timeLimitMinutes: 10 });

      expect(minutesSelect()).toHaveValue('10');
    });

    it('通知が無効なら分数の選択欄を出さない', () => {
      renderSection({ timeLimitEnabled: false, timeLimitMinutes: 3 });

      expect(screen.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  describe('選択肢', () => {
    it('1 / 3 / 5 / 10 分を選べる', () => {
      renderSection(undefined);

      const values = screen
        .getAllByRole('option')
        .map((option) => (option as HTMLOptionElement).value);
      expect(values).toEqual(['1', '3', '5', '10']);
    });
  });

  describe('操作', () => {
    it('通知を切ると、分数を保ったまま無効で保存する', () => {
      const { onUpdate } = renderSection({
        timeLimitEnabled: true,
        timeLimitMinutes: 10
      });

      fireEvent.click(screen.getByRole('switch'));

      expect(onUpdate).toHaveBeenCalledWith({
        timeLimitEnabled: false,
        timeLimitMinutes: 10
      });
    });

    it('通知が無効のときに切り替えると、既定の分数のまま有効で保存する', () => {
      const { onUpdate } = renderSection({
        timeLimitEnabled: false,
        timeLimitMinutes: 3
      });

      fireEvent.click(screen.getByRole('switch'));

      expect(onUpdate).toHaveBeenCalledWith({
        timeLimitEnabled: true,
        timeLimitMinutes: 3
      });
    });

    it('分数を変えると、有効のまま数値で保存する', () => {
      const { onUpdate } = renderSection({
        timeLimitEnabled: true,
        timeLimitMinutes: 5
      });

      fireEvent.change(minutesSelect(), { target: { value: '1' } });

      expect(onUpdate).toHaveBeenCalledWith({
        timeLimitEnabled: true,
        timeLimitMinutes: 1
      });
    });

    it('設定が未保存でも操作すれば既定値を補って保存する', () => {
      const { onUpdate } = renderSection(undefined);

      fireEvent.change(minutesSelect(), { target: { value: '10' } });

      expect(onUpdate).toHaveBeenCalledWith({
        timeLimitEnabled: true,
        timeLimitMinutes: 10
      });
    });
  });
});
