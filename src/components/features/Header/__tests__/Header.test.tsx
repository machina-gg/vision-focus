import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Header } from '../Header';

describe('Header', () => {
  describe('ロゴとバージョン', () => {
    it('ロゴ画像がデータ URL 付きで表示される', () => {
      render(<Header />);

      const logo = screen.getByTestId('app-logo');
      expect(logo).toHaveAttribute('alt', 'VisionFocus');
      expect(logo.getAttribute('src')).toMatch(/^data:image\//);
    });

    it('プロダクト名とバージョンが表示される', () => {
      render(<Header />);

      expect(screen.getByText('VisionFocus')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });
  });

  describe('設定ボタン', () => {
    it('showSettings 未指定では設定ボタンが表示される', () => {
      render(<Header />);

      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
    });

    it('showSettings が false のとき設定ボタンは表示されない', () => {
      render(<Header showSettings={false} />);

      expect(screen.queryByTestId('settings-button')).not.toBeInTheDocument();
    });

    it('設定ボタンのクリックで onSettingsClick が呼ばれる', () => {
      const onSettingsClick = vi.fn();
      render(<Header onSettingsClick={onSettingsClick} />);

      fireEvent.click(screen.getByTestId('settings-button'));

      expect(onSettingsClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('ヘルプボタン', () => {
    it('onHelpClick が未指定のときヘルプボタンは表示されない', () => {
      render(<Header />);

      expect(screen.queryByTestId('help-button')).not.toBeInTheDocument();
    });

    it('onHelpClick を渡すとヘルプボタンが表示され、クリックで呼ばれる', () => {
      const onHelpClick = vi.fn();
      render(<Header onHelpClick={onHelpClick} />);

      fireEvent.click(screen.getByTestId('help-button'));

      expect(onHelpClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('一時停止トグル', () => {
    it('onPausedChange が未指定のときトグルは表示されない', () => {
      render(<Header />);

      expect(screen.queryByTestId('pause-toggle')).not.toBeInTheDocument();
    });

    it('paused 未指定（= false）では有効と表示され、トグルは ON', () => {
      render(<Header onPausedChange={vi.fn()} />);

      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByTestId('pause-toggle')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('paused が true では無効と表示され、トグルは OFF', () => {
      render(<Header paused onPausedChange={vi.fn()} />);

      expect(screen.getByText('disabled')).toBeInTheDocument();
      expect(screen.getByTestId('pause-toggle')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('稼働中にトグルを押すと onPausedChange(true) が呼ばれる', () => {
      const onPausedChange = vi.fn();
      render(<Header onPausedChange={onPausedChange} />);

      fireEvent.click(screen.getByTestId('pause-toggle'));

      expect(onPausedChange).toHaveBeenCalledWith(true);
    });

    it('一時停止中にトグルを押すと onPausedChange(false) が呼ばれる', () => {
      const onPausedChange = vi.fn();
      render(<Header paused onPausedChange={onPausedChange} />);

      fireEvent.click(screen.getByTestId('pause-toggle'));

      expect(onPausedChange).toHaveBeenCalledWith(false);
    });
  });
});
