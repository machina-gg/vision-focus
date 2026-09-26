import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { YouTubeFeatureToggle } from '../YouTubeFeatureToggle';

type ToggleProps = Parameters<typeof YouTubeFeatureToggle>[0];

function renderToggle(props: Partial<ToggleProps> = {}) {
  const onChange = props.onChange ?? vi.fn();

  render(
    <YouTubeFeatureToggle
      icon={<span data-testid="feature-icon" />}
      title="ショート動画を隠す"
      description="ホームからショート動画の欄を消します"
      checked={false}
      {...props}
      onChange={onChange}
    />
  );

  return { onChange, toggle: screen.getByRole('switch') };
}

describe('YouTubeFeatureToggle', () => {
  describe('受け取った値の表示', () => {
    it('見出しと説明文をそのまま出す', () => {
      renderToggle();

      expect(
        screen.getByRole('heading', { name: 'ショート動画を隠す' })
      ).toBeInTheDocument();
      expect(
        screen.getByText('ホームからショート動画の欄を消します')
      ).toBeInTheDocument();
    });

    it('渡したアイコンをそのまま描画する', () => {
      renderToggle();

      expect(screen.getByTestId('feature-icon')).toBeInTheDocument();
    });

    it('説明文が空文字でも例外にならない', () => {
      expect(() => renderToggle({ description: '' })).not.toThrow();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });
  });

  describe('切のとき', () => {
    it('スイッチが切として支援技術に見える', () => {
      const { toggle } = renderToggle({ checked: false });

      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('押すと true が渡る', () => {
      const { toggle, onChange } = renderToggle({ checked: false });

      fireEvent.click(toggle);

      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('入のとき', () => {
    it('スイッチが入として支援技術に見える', () => {
      const { toggle } = renderToggle({ checked: true });

      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('押すと false が渡る', () => {
      const { toggle, onChange } = renderToggle({ checked: true });

      fireEvent.click(toggle);

      expect(onChange).toHaveBeenCalledWith(false);
    });
  });

  describe('無効化したとき', () => {
    it('スイッチを押しても onChange が呼ばれない', () => {
      const { toggle, onChange } = renderToggle({
        checked: false,
        disabled: true
      });

      expect(toggle).toBeDisabled();
      fireEvent.click(toggle);

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
