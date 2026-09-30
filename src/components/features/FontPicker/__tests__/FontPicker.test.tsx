import React from 'react';

import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { FontPicker } from '../FontPicker';
import { FONT_CATEGORIES, type FontSettings } from '~/types/font';

const settingsOf = (overrides: Partial<FontSettings> = {}): FontSettings => ({
  family: 'system',
  size: 'md',
  weight: 'bold',
  ...overrides
});

function renderPicker(
  value: FontSettings = settingsOf(),
  props: { previewText?: string; disabled?: boolean } = {}
) {
  const onChange = vi.fn();
  const result = render(
    <FontPicker
      value={value}
      onChange={onChange}
      previewText={props.previewText}
      disabled={props.disabled}
    />
  );
  return { onChange, ...result };
}

const familySelect = () =>
  screen.getByTestId<HTMLSelectElement>('font-family-select');

const buttonTexts = (testId: string) =>
  screen.getAllByTestId(testId).map((el) => el.textContent);

const pressedTexts = (testId: string) =>
  screen
    .getAllByTestId(testId)
    .filter((el) => el.getAttribute('aria-pressed') === 'true')
    .map((el) => el.textContent);

const clickButton = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => {
  // Google Fonts の link は document.head に残るため、テストごとに片付ける
  document
    .querySelectorAll('link[id^="google-font-"]')
    .forEach((link) => link.remove());
});

describe('FontPicker', () => {
  describe('プレビュー', () => {
    it('既定の文言を出す', () => {
      renderPicker();

      expect(screen.getByText('Focus on your goals')).toBeInTheDocument();
    });

    it('渡した文言を出す', () => {
      renderPicker(settingsOf(), { previewText: '今日の目標' });

      expect(screen.getByText('今日の目標')).toBeInTheDocument();
    });

    it('空文字でも例外にならない', () => {
      renderPicker(settingsOf(), { previewText: '' });

      expect(familySelect()).toBeInTheDocument();
    });

    it.each([
      ['sm', '30px'],
      ['md', '36px'],
      ['lg', '48px']
    ] as const)('大きさ %s をダッシュボードと同じ %s で出す', (size, px) => {
      renderPicker(settingsOf({ size }));

      expect(screen.getByText('Focus on your goals')).toHaveStyle({
        fontSize: px
      });
    });

    it('選んだ太さを反映する', () => {
      renderPicker(settingsOf({ weight: 'normal' }));

      expect(screen.getByText('Focus on your goals')).toHaveStyle({
        fontWeight: '400'
      });
    });
  });

  describe('フォントのプルダウン', () => {
    it('ラベルでプルダウンを指せる', () => {
      renderPicker();

      expect(screen.getByLabelText('fontFamily')).toBe(familySelect());
    });

    it('分類を見出しにして、分類順・分類内の順ですべてのフォントを並べる', () => {
      renderPicker();

      const groups = within(familySelect())
        .getAllByRole('group')
        .map((group) => ({
          label: group.getAttribute('label'),
          fonts: within(group)
            .getAllByRole('option')
            .map((option) => option.textContent)
        }));
      expect(groups).toEqual(
        Object.values(FONT_CATEGORIES).map((category) => ({
          label: category.name,
          fonts: category.fonts.map((font) => font.name)
        }))
      );
    });

    it('渡されたフォントを選択中にする', () => {
      renderPicker(settingsOf({ family: 'playfair' }));

      expect(familySelect().value).toBe('playfair');
    });

    it('選んだフォントで onChange が呼ばれ、他の設定は保つ', () => {
      const { onChange } = renderPicker(
        settingsOf({ family: 'inter', size: 'sm', weight: 'medium' })
      );

      fireEvent.change(familySelect(), { target: { value: 'notosansjp' } });

      expect(onChange).toHaveBeenCalledWith({
        family: 'notosansjp',
        size: 'sm',
        weight: 'medium'
      });
    });
  });

  describe('Google Fonts の読み込み', () => {
    it('選択中のフォントだけを読み込む', () => {
      renderPicker(settingsOf({ family: 'inter' }));

      expect(
        Array.from(document.querySelectorAll('link[id^="google-font-"]')).map(
          (link) => link.id
        )
      ).toEqual(['google-font-Inter']);
    });

    it('システムフォントなら何も読み込まない', () => {
      renderPicker(settingsOf({ family: 'system' }));

      expect(
        document.querySelectorAll('link[id^="google-font-"]')
      ).toHaveLength(0);
    });

    it('フォントが変わったら、変わった先のフォントを読み込む', () => {
      const { rerender } = renderPicker(settingsOf({ family: 'inter' }));

      rerender(
        <FontPicker value={settingsOf({ family: 'lora' })} onChange={vi.fn()} />
      );

      expect(document.getElementById('google-font-Lora')).not.toBeNull();
    });

    it('同じフォントを二度読み込まない', () => {
      const { rerender } = renderPicker(settingsOf({ family: 'inter' }));

      rerender(
        <FontPicker
          value={settingsOf({ family: 'inter' })}
          onChange={vi.fn()}
        />
      );

      expect(
        document.querySelectorAll('link[id="google-font-Inter"]')
      ).toHaveLength(1);
    });
  });

  describe('大きさの選択', () => {
    it('3 段階から選べる', () => {
      renderPicker();

      expect(buttonTexts('font-size-button')).toEqual([
        'Small',
        'Medium',
        'Large'
      ]);
    });

    it('押した大きさで onChange が呼ばれ、他の設定は保つ', () => {
      const { onChange } = renderPicker(settingsOf({ family: 'lora' }));

      clickButton('Large');

      expect(onChange).toHaveBeenCalledWith({
        family: 'lora',
        size: 'lg',
        weight: 'bold'
      });
    });
  });

  describe('太さの選択', () => {
    it('3 段階から選べる', () => {
      renderPicker();

      expect(buttonTexts('font-weight-button')).toEqual([
        'Normal',
        'Medium',
        'Bold'
      ]);
    });

    it('押した太さで onChange が呼ばれ、他の設定は保つ', () => {
      const { onChange } = renderPicker(settingsOf({ size: 'sm' }));

      clickButton('Normal');

      expect(onChange).toHaveBeenCalledWith({
        family: 'system',
        size: 'sm',
        weight: 'normal'
      });
    });
  });

  describe('選択中の印', () => {
    it('渡された大きさ・太さだけが押下状態になる', () => {
      renderPicker(settingsOf({ size: 'lg', weight: 'normal' }));

      expect(pressedTexts('font-size-button')).toEqual(['Large']);
      expect(pressedTexts('font-weight-button')).toEqual(['Normal']);
    });
  });

  describe('disabled のとき', () => {
    it('プルダウンとすべての選択ボタンを操作できなくする', () => {
      renderPicker(settingsOf(), { disabled: true });

      expect(familySelect()).toBeDisabled();
      ['font-size-button', 'font-weight-button'].forEach((testId) => {
        screen.getAllByTestId(testId).forEach((button) => {
          expect(button).toBeDisabled();
        });
      });
    });

    it('キーボードから届いても設定は書き換わらない', () => {
      const { onChange } = renderPicker(settingsOf(), { disabled: true });

      // 包む div の pointer-events はマウスしか止めないため、無効の属性が無いとこの押下で設定が書き換わる
      clickButton('Large');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('disabled を渡さなければ押せる', () => {
      const { onChange } = renderPicker();

      clickButton('Large');

      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });
});
