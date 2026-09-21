import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { FontPicker } from '../FontPicker';
import { FONT_CATEGORIES, type FontSettings } from '~/types/font';

/**
 * FontPicker の選択肢の出し分けと、保存内容の検査
 *
 * 開いたときにどのカテゴリが選ばれるかは、渡されたフォントの所属で決まる。
 * カテゴリを変えると先頭のフォントが自動で選ばれるため、onChange に渡る設定が
 * 他の項目（サイズ・太さ）を保ったままかまで見る。
 *
 * ⚠ 選択中のボタンの強調は枠線と背景色のクラス名でしか表現されていないため
 * 検査しない（machina-gg/vision-focus#455）。プレビューは装飾ではなく
 * 「選んだ値がどう見えるか」そのものなので、インラインの style を確かめる。
 */

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

const buttonTexts = (testId: string) =>
  screen.getAllByTestId(testId).map((el) => el.textContent);

/** 名前でボタンを押す（カテゴリ名・フォント名・サイズ名・太さ名） */
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

      expect(screen.getByText('fontCategory')).toBeInTheDocument();
    });

    it('選んだ大きさと太さを反映する', () => {
      renderPicker(settingsOf({ size: 'xl', weight: 'normal' }));

      const preview = screen.getByText('Focus on your goals');
      expect(preview).toHaveStyle({ fontSize: '48px', fontWeight: '400' });
    });
  });

  describe('カテゴリ', () => {
    it('すべてのカテゴリを選べる', () => {
      renderPicker();

      expect(buttonTexts('font-category-button')).toEqual([
        'System',
        'Modern',
        'Elegant',
        'Impact',
        'Handwriting',
        'Japanese'
      ]);
    });

    it('渡されたフォントが属するカテゴリの一覧を開く', () => {
      renderPicker(settingsOf({ family: 'playfair' }));

      expect(buttonTexts('font-family-button')).toEqual(
        FONT_CATEGORIES.elegant.fonts.map((font) => font.name)
      );
    });

    it('カテゴリを変えると、そのカテゴリのフォント一覧に入れ替わる', () => {
      renderPicker();

      clickButton('Japanese');

      expect(buttonTexts('font-family-button')).toEqual(
        FONT_CATEGORIES.japanese.fonts.map((font) => font.name)
      );
      expect(screen.queryByText('System Default')).not.toBeInTheDocument();
    });

    it('カテゴリを変えると先頭のフォントを選び、他の設定は保つ', () => {
      const { onChange } = renderPicker(
        settingsOf({ size: 'sm', weight: 'medium' })
      );

      clickButton('Elegant');

      expect(onChange).toHaveBeenCalledWith({
        family: FONT_CATEGORIES.elegant.fonts[0].family,
        size: 'sm',
        weight: 'medium'
      });
    });
  });

  describe('フォントの選択', () => {
    it('押したフォントで onChange が呼ばれる', () => {
      const { onChange } = renderPicker(settingsOf({ family: 'inter' }));

      clickButton('Roboto');

      expect(onChange).toHaveBeenCalledWith({
        family: 'roboto',
        size: 'md',
        weight: 'bold'
      });
    });

    it('Google Fonts のフォントを選ぶと読み込みの link を足す', () => {
      renderPicker(settingsOf({ family: 'inter' }));

      expect(document.getElementById('google-font-Inter')).not.toBeNull();
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
    it('4 段階から選べる', () => {
      renderPicker();

      expect(buttonTexts('font-size-button')).toEqual([
        'Small',
        'Medium',
        'Large',
        'Extra Large'
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
    it('4 段階から選べる', () => {
      renderPicker();

      expect(buttonTexts('font-weight-button')).toEqual([
        'Normal',
        'Medium',
        'Semibold',
        'Bold'
      ]);
    });

    it('押した太さで onChange が呼ばれ、他の設定は保つ', () => {
      const { onChange } = renderPicker(settingsOf({ size: 'sm' }));

      clickButton('Semibold');

      expect(onChange).toHaveBeenCalledWith({
        family: 'system',
        size: 'sm',
        weight: 'semibold'
      });
    });
  });
});
