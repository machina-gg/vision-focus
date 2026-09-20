import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { DownloadButton } from '../DownloadButton';
import { STATUS_RESET_DELAY_MS } from '~/constants/intervals';

/**
 * DownloadButton の表示分岐とコールバックの検査
 *
 * 壁紙の保存は成否が画面のアイコンでしか分からないため、成功・失敗の
 * どちらでも表示が切り替わること、保存に渡る引数（解像度・品質）が
 * 選んだ選択肢どおりであることを確かめる。
 *
 * chrome.i18n はテスト環境に無く、getMessage はキー名をそのまま返す
 * （src/lib/i18n.ts）。文言の検査はキー名で行う。
 */

const wallpaper = vi.hoisted(() => ({
  downloadWallpaper: vi.fn(),
  getResolutionOptions: vi.fn()
}));

const analytics = vi.hoisted(() => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/wallpaper', () => ({
  downloadWallpaper: wallpaper.downloadWallpaper,
  getResolutionOptions: wallpaper.getResolutionOptions
}));

vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: analytics.trackFeatureUse
}));

/** 保存対象の要素を持つ ref（新規タブのダッシュボード相当） */
function refWithElement(): React.RefObject<HTMLElement> {
  return { current: document.createElement('div') };
}

/** 保存対象がまだ描画されていない ref */
function emptyRef(): React.RefObject<HTMLElement> {
  return { current: null } as React.RefObject<HTMLElement>;
}

function openMenu() {
  fireEvent.click(screen.getByTestId('newtab-download-button'));
}

beforeEach(() => {
  wallpaper.downloadWallpaper.mockReset().mockResolvedValue(undefined);
  wallpaper.getResolutionOptions.mockReset().mockReturnValue([
    { value: '1080p', label: 'Full HD', dimensions: '1920 x 1080' },
    { value: '4k', label: '4K Ultra HD', dimensions: '3840 x 2160' }
  ]);
  analytics.trackFeatureUse.mockReset();
});

describe('DownloadButton', () => {
  describe('初期表示', () => {
    it('ラベルと説明を表示し、解像度メニューは閉じている', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      expect(screen.getByTestId('newtab-download-button')).toHaveTextContent(
        'download'
      );
      expect(screen.getByTitle('downloadWallpaper')).toBeInTheDocument();
      expect(screen.queryByText('selectResolution')).not.toBeInTheDocument();
    });

    it('disabled ならボタンを押せない', () => {
      render(<DownloadButton targetRef={refWithElement()} disabled />);

      expect(screen.getByTestId('newtab-download-button')).toBeDisabled();
    });

    it('disabled を省略すると押せる', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      expect(screen.getByTestId('newtab-download-button')).toBeEnabled();
    });
  });

  describe('解像度メニュー', () => {
    it('押すと解像度の選択肢がラベルと寸法つきで並ぶ', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();

      expect(screen.getByText('selectResolution')).toBeInTheDocument();
      expect(screen.getByText('Full HD')).toBeInTheDocument();
      expect(screen.getByText('1920 x 1080')).toBeInTheDocument();
      expect(screen.getByText('4K Ultra HD')).toBeInTheDocument();
      expect(screen.getByText('3840 x 2160')).toBeInTheDocument();
    });

    it('選択肢が 0 件ならメニューの見出しだけを出す', () => {
      wallpaper.getResolutionOptions.mockReturnValue([]);
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();

      expect(screen.getByText('selectResolution')).toBeInTheDocument();
      // メニュー内の選択肢が無いので、押せるボタンは本体だけ
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('もう一度押すと閉じる', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      openMenu();

      expect(screen.queryByText('selectResolution')).not.toBeInTheDocument();
    });
  });

  describe('保存', () => {
    it('選んだ解像度で保存され、利用実績が記録される', async () => {
      const targetRef = refWithElement();
      render(<DownloadButton targetRef={targetRef} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('4K Ultra HD'));
      });

      expect(wallpaper.downloadWallpaper).toHaveBeenCalledWith(
        targetRef.current,
        'visionfocus-wallpaper',
        { resolution: '4k', quality: 0.95 }
      );
      expect(analytics.trackFeatureUse).toHaveBeenCalledWith(
        'wallpaper_download'
      );
    });

    it('保存が始まるとメニューは閉じる', async () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(screen.queryByText('selectResolution')).not.toBeInTheDocument();
    });

    it('保存対象が未描画なら保存せず、利用実績も記録しない', async () => {
      render(<DownloadButton targetRef={emptyRef()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(wallpaper.downloadWallpaper).not.toHaveBeenCalled();
      expect(analytics.trackFeatureUse).not.toHaveBeenCalled();
    });
  });

  describe('保存結果の表示', () => {
    // 成功・失敗はアイコンでしか区別できないため、lucide が付ける
    // クラス名（lucide-<アイコン名>）で判別する
    it('成功するとチェックのアイコンに変わる', async () => {
      const { container } = render(
        <DownloadButton targetRef={refWithElement()} />
      );

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(container.querySelector('.lucide-check')).not.toBeNull();
      expect(container.querySelector('.lucide-chevron-down')).toBeNull();
    });

    it('失敗すると × のアイコンに変わる', async () => {
      wallpaper.downloadWallpaper.mockRejectedValue(new Error('canvas error'));
      const { container } = render(
        <DownloadButton targetRef={refWithElement()} />
      );

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(container.querySelector('.lucide-x')).not.toBeNull();
      expect(analytics.trackFeatureUse).not.toHaveBeenCalled();
    });

    it('保存前はダウンロードのアイコンを出す', () => {
      const { container } = render(
        <DownloadButton targetRef={refWithElement()} />
      );

      expect(container.querySelector('.lucide-download')).not.toBeNull();
      expect(container.querySelector('.lucide-check')).toBeNull();
    });
  });

  describe('結果表示の自動リセット', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('一定時間たつとダウンロードのアイコンへ戻る', async () => {
      const { container } = render(
        <DownloadButton targetRef={refWithElement()} />
      );

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });
      expect(container.querySelector('.lucide-check')).not.toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(STATUS_RESET_DELAY_MS);
      });

      expect(container.querySelector('.lucide-check')).toBeNull();
      expect(container.querySelector('.lucide-download')).not.toBeNull();
    });
  });
});
